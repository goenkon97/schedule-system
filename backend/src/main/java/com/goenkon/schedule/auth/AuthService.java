// =====================================================================
// AuthService.java：登录的业务逻辑
//
// 登录要回答一个问题：「这个人说自己是 manager@demo.com，密码是 demo1234，是真的吗？」
// 步骤：
//   1. 按邮箱找账号（找不到 → 失败）
//   2. 用 BCrypt 比对密码（对不上 → 失败）
//   3. 这个员工有没有被删除（被删除了 → 失败：人已经离职，账号跟着失效）
//   4. 都通过 → 发一张 JWT 通行证（JwtService），连同他的信息一起返回
// 任何一步失败，都返回同一句「邮箱或密码错误」，原因见下面的注释。
// =====================================================================

package com.goenkon.schedule.auth;

// PasswordEncoder：BCrypt 工具（PasswordConfig 里放进 Spring 容器的那个），这里用它的 matches 比对密码
import org.springframework.security.crypto.password.PasswordEncoder;
// Service：标记这是业务层的类，Spring 启动时 new 一个放进容器
import org.springframework.stereotype.Service;
// Transactional：事务。这里主要是为了「懒加载」：账号的 employee 要在事务里（数据库连接还开着）才能查
import org.springframework.transaction.annotation.Transactional;

// ApiException：我们自己的业务异常，throw 出去以后 GlobalExceptionHandler 会变成 {"message": ...} 返回
import com.goenkon.schedule.common.ApiException;

@Service
// readOnly = true：整个类默认是「只读事务」—— 登录只查不改，Hibernate 不用做脏检查，更省资源
@Transactional(readOnly = true)
public class AuthService {

	// 登录失败时统一的提示。
	// 为什么不分别说「邮箱不存在」「密码错误」？
	//   如果分开说，坏人就能拿着一堆邮箱来试：提示「密码错误」的，就说明这个邮箱在系统里有账号。
	//   这叫「账号枚举」攻击。统一一句话，就什么都试不出来。
	private static final String LOGIN_FAILED = "邮箱或密码错误。";

	// 邮箱不存在时，也假装比对一次密码用的「假哈希」（下面 login 方法里解释为什么）。
	// 这是 "dummy-password" 用 BCrypt（强度 10）真实算出来的哈希。
	//   必须是「真的、格式正确」的 BCrypt 哈希：如果格式不对，matches 会立刻返回 false（不做计算），就起不到「花同样时间」的作用了
	private static final String DUMMY_HASH = "$2a$10$S.pkTHUVBg1jIiyMmLYEhOnG3vxenPIyeRX/EP9ueTJgh7k4q1.mG";

	// 三个依赖，构造方法注入（Spring 按类型找到它们传进来）
	private final AccountRepository accountRepository;
	private final PasswordEncoder passwordEncoder;
	// 新加的：发通行证的工具（JwtService 上有 @Service，Spring 启动时已经 new 好放在容器里了）
	private final JwtService jwtService;

	public AuthService(AccountRepository accountRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
		this.accountRepository = accountRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
	}

	// 登录：成功返回「通行证 + 用户信息」，失败抛 401
	//   返回类型从 MeResponse 改成了 LoginResponse：因为现在要交出去两样东西（token 和 user）
	public LoginResponse login(LoginRequest request) {
		// 邮箱统一转成小写、去掉前后空格再查 —— 和 Account 构造方法里存进去的规则一样，
		// 这样用户输入 Manager@Demo.com 也能登录
		String email = request.email().trim().toLowerCase();

		// ① 按邮箱找账号：SELECT ... FROM accounts WHERE email = ?
		//   findByEmail 返回 Optional（可能是空盒子），这里不用 orElseThrow，因为找不到时还要做一件事（见下）
		Account account = accountRepository.findByEmail(email).orElse(null);

		if (account == null) {
			// 邮箱不存在：也拿一个假哈希比对一次密码，然后再失败。为什么？
			//   BCrypt 比对一次要几十毫秒（故意算得慢）。如果邮箱不存在就立刻返回，
			//   坏人测一下响应时间就能分辨：「很快失败 = 邮箱不存在」「慢一点失败 = 邮箱存在、密码错」。
			//   这叫「时序攻击」。两种情况都比对一次，花的时间就差不多了，什么都看不出来。
			passwordEncoder.matches(request.password(), DUMMY_HASH);
			throw ApiException.unauthorized(LOGIN_FAILED);
		}

		// ② 比对密码：matches(用户输入的原文, 数据库里的哈希)
		//   它会从哈希里取出当初的「盐」，用同样的盐把输入的密码再算一遍，看结果是不是一样。
		//   不能自己 encode 一次再用 equals 比：每次 encode 的盐都是随机的，同一个密码两次结果不一样，永远不相等。
		if (!passwordEncoder.matches(request.password(), account.getPasswordHash())) {
			throw ApiException.unauthorized(LOGIN_FAILED);
		}

		// ③ 员工已经被删除（离职了）：账号也不能再用。
		//   account.getEmployee() 是懒加载的替身，调用 isDeleted() 这一刻才执行 SELECT ... FROM employees WHERE id = ?
		//   能查成功，是因为我们还在 @Transactional 的方法里（数据库连接还开着）
		if (account.getEmployee().isDeleted()) {
			throw ApiException.unauthorized(LOGIN_FAILED);
		}

		// ④ 全部通过：
		//   发通行证：createToken 里会读 account.getEmployee().getId()（懒加载），所以必须在事务里调用 —— 这里正是
		String token = jwtService.createToken(account);
		//   把「通行证」和「这个人是谁」一起装进 LoginResponse 交出去
		//   （MeResponse.from 同样会碰懒加载的员工信息，也要在事务里，出了这个方法就用不了了）
		return new LoginResponse(token, MeResponse.from(account));
	}

	// ---------------------------------------------------------------
	// 我是谁：GET /api/auth/me 调用
	//   参数 accountId：门卫从通行证里读出来的账号 id
	//   为什么不直接用通行证里的信息，还要再查一次数据库？
	//     通行证里只有 id 和角色，没有名字、邮箱；而且名字可能被店长改过。
	//     查数据库拿到的是「现在」最新的信息。
	//     另外，如果这个员工在通行证有效期内被删除（离职）了，这里也能发现，直接 401。
	// ---------------------------------------------------------------
	public MeResponse me(Long accountId) {
		// findById：JpaRepository 白送的方法，按主键（账号 id）找一行 → SELECT ... FROM accounts WHERE id = ?
		Account account = accountRepository.findById(accountId)
				// filter：盒子里有东西，再加一个条件 —— 员工没被删除才算数（这里会触发懒加载，查 employees 表）
				.filter(a -> !a.getEmployee().isDeleted())
				// 盒子是空的（账号没了，或者员工被删除了）→ 401，让前端回到登录页
				.orElseThrow(() -> ApiException.unauthorized("登录已失效，请重新登录。"));
		// 还在事务里（类上的 @Transactional），把需要的信息取出来装进 MeResponse
		return MeResponse.from(account);
	}
}
