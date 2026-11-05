// =====================================================================
// JwtService.java：发通行证（JWT）、检查通行证
//
// 先用大白话说 JWT 是什么：
//   后端没有记性 —— 每个请求都是全新的，它不记得刚才是谁登录过。
//   所以登录成功时，后端发一张「通行证」给前端，像游乐园入口给你戴的手环：
//     上面写着：你是 8 号员工、角色是店长、几点之前有效
//     最后盖一个章：只有后端手里的「秘密钥匙」才能盖出这个章
//   之后前端每个请求都带着这张通行证，后端只要检查「章是不是真的、有没有过期」，
//   就知道是谁发来的，不用再查密码，也不用记住任何东西。
//
// 一张通行证（token）长这样，用两个点隔成三段：
//   eyJhbGciOiJIUzI1NiJ9 . eyJzdWIiOiIxIiwicm9sZSI6Im1hbmFnZXIi... . Xk3p9w...
//   └─ 第 1 段：头 ─┘      └────────── 第 2 段：内容 ──────────┘     └ 第 3 段：章 ┘
//   第 1、2 段只是把文字换了一种写法（Base64 编码），任何人都能还原回来看 —— 所以里面绝对不放密码！
//   第 3 段是用「秘密钥匙 + 前两段内容」算出来的：内容改了一个字，章就对不上了。
//   所以：别人看得到内容，但改不了内容。
// =====================================================================

package com.goenkon.schedule.auth;

// ---------- Java 自带的 ----------
// StandardCharsets.UTF_8：把字符串变成字节时用的编码（钥匙要以字节的形式交给签名工具）
import java.nio.charset.StandardCharsets;
// ParseException：解析 token 时格式不对会抛出它（比如传来的根本不是三段式的字符串）
import java.text.ParseException;
// Duration：一段时间（比如 12 小时）；Instant：一个时间点（比如现在）
import java.time.Duration;
import java.time.Instant;
// Date：Nimbus 这个库表示时间用的是老式的 Date 类型，要从 Instant 转过去
import java.util.Date;

// ---------- Spring ----------
// Value：从 application.properties 里读配置的值，塞进构造方法的参数
import org.springframework.beans.factory.annotation.Value;
// Service：让 Spring 启动时 new 一个 JwtService 放进容器，谁需要就塞给谁
import org.springframework.stereotype.Service;

// ---------- Nimbus（pom.xml 里新加的 nimbus-jose-jwt）----------
// JOSEException：签名 / 验证签名出问题时抛出的异常
import com.nimbusds.jose.JOSEException;
// JWSAlgorithm：用哪种算法盖章。HS256 = 用「同一把秘密钥匙」盖章和验章
import com.nimbusds.jose.JWSAlgorithm;
// JWSHeader：通行证的第 1 段「头」，写着用的是哪种算法
import com.nimbusds.jose.JWSHeader;
// MACSigner：盖章的工具；MACVerifier：验章的工具（HS256 用的就是这一对）
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
// JWTClaimsSet：通行证的第 2 段「内容」（写着你是谁、什么时候过期）
import com.nimbusds.jwt.JWTClaimsSet;
// SignedJWT：一张完整的、盖了章的通行证
import com.nimbusds.jwt.SignedJWT;

// ---------- 我们自己的 ----------
import com.goenkon.schedule.common.ApiException;

@Service
public class JwtService {

	// 检查失败时统一的提示：没登录、token 是假的、过期了，都说这一句（不告诉外人具体哪里不对）
	private static final String INVALID_TOKEN = "登录已失效，请重新登录。";

	// 盖章工具和验章工具：启动时用秘密钥匙做好，之后每次请求都直接用，不用每次重新做
	private final MACSigner signer;
	private final MACVerifier verifier;
	// 通行证有效多久
	private final Duration ttl;

	// 构造方法：Spring 启动时调用。
	// @Value("${app.jwt.secret}")：去 application.properties 里找 app.jwt.secret 这一行，把它的值传进来。
	//   （那一行又写着 ${JWT_SECRET:...}：有环境变量 JWT_SECRET 就用环境变量，没有就用冒号后面的默认值）
	public JwtService(@Value("${app.jwt.secret}") String secret,
			@Value("${app.jwt.ttl-hours}") long ttlHours) {
		// 钥匙要以「字节」的形式交给工具：getBytes 把文字按 UTF-8 变成一串字节
		byte[] key = secret.getBytes(StandardCharsets.UTF_8);
		try {
			this.signer = new MACSigner(key);
			this.verifier = new MACVerifier(key);
		} catch (JOSEException e) {
			// 钥匙太短（少于 32 个字节）时会走到这里。
			// 直接抛一个异常让程序启动失败 —— 宁可启动不了，也不能带着一把不安全的钥匙上线。
			// IllegalStateException：Java 自带的异常，意思是「程序处于不该出现的状态」
			throw new IllegalStateException("app.jwt.secret 至少要 32 个字符", e);
		}
		this.ttl = Duration.ofHours(ttlHours);
	}

	// ---------------------------------------------------------------
	// 发通行证：登录成功时调用，返回一长串 token
	// ---------------------------------------------------------------
	public String createToken(Account account) {
		// 现在这一刻（服务器的时钟）
		Instant now = Instant.now();

		// ① 写内容（第 2 段）。JWT 有几个约定好的名字：
		//   subject（sub）   → 这张通行证是发给谁的：我们放账号 id（规定必须是字符串，所以 toString）
		//   issueTime（iat） → 什么时候发的
		//   expirationTime（exp） → 什么时候过期
		//   claim("名字", 值) → 我们自己加的信息：员工 id、角色
		// Builder 写法：一个个 .xxx() 设置好，最后 .build() 做出来（像点菜：先一样样点，最后下单）
		JWTClaimsSet claims = new JWTClaimsSet.Builder()
				.subject(account.getId().toString())
				.claim("employeeId", account.getEmployee().getId())   // 懒加载：这里会查 employees 表，所以要在事务里调用
				.claim("role", account.getRole().name())               // 枚举存成文字 "manager" / "staff"
				.issueTime(Date.from(now))
				.expirationTime(Date.from(now.plus(ttl)))               // 现在 + 12 小时
				.build();

		// ② 头（第 1 段）写上算法 HS256，和内容放在一起，变成一张还没盖章的通行证
		SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
		try {
			// ③ 盖章：用秘密钥匙 + 前两段内容，算出第 3 段
			jwt.sign(signer);
		} catch (JOSEException e) {
			// 钥匙在启动时已经检查过了，正常不会走到这里；万一出错，就当服务器内部错误
			throw new IllegalStateException("生成 token 失败", e);
		}
		// ④ 把三段拼成 「xxx.yyy.zzz」 这样的一串字符，交给前端
		return jwt.serialize();
	}

	// ---------------------------------------------------------------
	// 检查通行证：之后每个请求，门卫（下一步写的拦截器）都会调用它
	//   章是真的、没过期 → 返回 TokenInfo（这个人是谁）
	//   任何一点不对    → 抛 401
	// ---------------------------------------------------------------
	public TokenInfo parse(String token) {
		try {
			// ① 把「xxx.yyy.zzz」拆回三段。格式不对（比如随便写的字符串）会抛 ParseException
			SignedJWT jwt = SignedJWT.parse(token);

			// ② 验章：用我们的秘密钥匙，把前两段重新算一遍，看和第 3 段对不对得上。
			//   有人改过内容（比如把 staff 改成 manager）→ 算出来的章不一样 → false
			//   有人用别的钥匙伪造 → 也对不上 → false
			if (!jwt.verify(verifier)) {
				throw ApiException.unauthorized(INVALID_TOKEN);
			}

			// ③ 章是真的，再看有没有过期：过期时间早于现在 → 失效
			JWTClaimsSet claims = jwt.getJWTClaimsSet();
			Date exp = claims.getExpirationTime();
			if (exp == null || exp.toInstant().isBefore(Instant.now())) {
				throw ApiException.unauthorized(INVALID_TOKEN);
			}

			// ④ 都没问题：把内容读出来，装进 TokenInfo
			//   Long.valueOf(...)：把字符串 "1" 变回数字 1
			//   Role.valueOf("manager")：把文字变回枚举 Role.manager
			return new TokenInfo(
					Long.valueOf(claims.getSubject()),
					claims.getLongClaim("employeeId"),
					Role.valueOf(claims.getStringClaim("role")));

		} catch (ParseException | JOSEException | IllegalArgumentException | NullPointerException e) {
			// catch (A | B | C e)：这几种异常都用同一种方式处理（Java 7 起的写法）
			//   ParseException            → token 格式不对
			//   JOSEException             → 验章过程出错
			//   IllegalArgumentException  → 内容里的值不对（比如 role 是个不存在的值）
			//   NullPointerException      → 内容缺了某一项
			// 不管哪种，对外都只说一句「登录已失效」：不告诉坏人他的假 token 具体错在哪
			throw ApiException.unauthorized(INVALID_TOKEN);
		}
	}
}
