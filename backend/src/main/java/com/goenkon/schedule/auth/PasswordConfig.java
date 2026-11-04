// =====================================================================
// PasswordConfig.java：把「密码哈希工具」BCryptPasswordEncoder 交给 Spring 管理
//
// 为什么要专门写一个配置类？
//   我们自己写的类（EmployeeService、AccountSeeder……）贴上 @Service / @Component，Spring 就会自动 new 它。
//   但 BCryptPasswordEncoder 是别人写好的类（在 spring-security-crypto 的 jar 包里），
//   我们没办法去它的源代码上贴 @Component。
//   这时就用 @Configuration + @Bean：自己写一个方法 new 出这个对象，交给 Spring，
//   之后谁需要 PasswordEncoder，在构造方法里写上这个参数，Spring 就会把这个对象注入进去。
//
// 好处：整个程序只有这一个 PasswordEncoder 对象（单例），
//      以后想换算法（比如换成 Argon2），只改这一个方法，用到它的地方一行都不用动。
// =====================================================================

package com.goenkon.schedule.auth;

// Bean：贴在方法上，表示「这个方法返回的对象，请放进 Spring 容器里管理」
import org.springframework.context.annotation.Bean;
// Configuration：贴在类上，表示「这是一个配置类，里面有 @Bean 方法」，Spring 启动时会调用这些方法
import org.springframework.context.annotation.Configuration;
// BCryptPasswordEncoder：BCrypt 算法的实现类（来自 pom.xml 里新加的 spring-security-crypto）
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
// PasswordEncoder：「密码编码器」接口，只规定两个能力：
//   encode(密码原文)          → 算出哈希（存进数据库用）
//   matches(密码原文, 哈希)   → 原文和哈希对不对得上（登录时用）
import org.springframework.security.crypto.password.PasswordEncoder;

// @Configuration：配置类。Spring 启动扫描到它，会执行下面所有 @Bean 方法，把返回值放进容器
@Configuration
public class PasswordConfig {

	// @Bean：这个方法的返回值放进 Spring 容器。
	//   Bean 的名字默认就是方法名（passwordEncoder），类型是返回值的类型（PasswordEncoder）。
	//   别的类按「类型」要它：构造方法参数写 PasswordEncoder passwordEncoder，Spring 就会把这个对象传进去。
	//
	// 返回值类型写接口 PasswordEncoder，而不是 BCryptPasswordEncoder：
	//   用的人只知道「它能 encode、能 matches」，不关心具体是哪种算法 —— 面向接口编程，以后换算法不影响别人。
	@Bean
	public PasswordEncoder passwordEncoder() {
		// new BCryptPasswordEncoder()：不传参数时，「强度」（cost）默认是 10。
		//   强度 10 的意思是：内部要重复计算 2 的 10 次方 = 1024 轮。
		//   在普通电脑上算一次大约要几十到一百毫秒 —— 对正常登录来说感觉不到，
		//   但对想「一秒试几亿个密码」的攻击者来说，就慢到几乎没法暴力破解。
		//   强度每加 1，计算时间就翻一倍。
		return new BCryptPasswordEncoder();
	}
}
