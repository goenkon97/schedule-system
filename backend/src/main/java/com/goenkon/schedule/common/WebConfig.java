// =====================================================================
// WebConfig.java：Web 相关的设置 —— 现在只做一件事：把门卫安排到门口
//
// 大白话：
//   AuthInterceptor 写好了，但 Spring 还不知道「哪些网址要经过它」。
//   这里告诉 Spring：/api/ 开头的所有请求都要过门卫，只有登录接口和 hello 测试接口不用。
//   （登录接口必须放过：还没登录的人手上没有通行证，要是也拦，就永远没人能登录了）
// =====================================================================

package com.goenkon.schedule.common;

// Configuration：配置类，Spring 启动时会读它
import org.springframework.context.annotation.Configuration;
// InterceptorRegistry：「门卫登记处」，在这里登记门卫和它要管的网址
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
// WebMvcConfigurer：Spring MVC 提供的「设置清单」接口，实现里面的方法就能改对应的设置
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.goenkon.schedule.auth.AuthInterceptor;

@Configuration
public class WebConfig implements WebMvcConfigurer {

	// 门卫：Spring 已经 new 好放在仓库里了（AuthInterceptor 上有 @Component），这里按类型吸过来
	private final AuthInterceptor authInterceptor;

	public WebConfig(AuthInterceptor authInterceptor) {
		this.authInterceptor = authInterceptor;
	}

	// addInterceptors：Spring 启动时调用，让我们在这里登记门卫
	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(authInterceptor)
				// 管哪些网址：/api/** = /api/ 后面不管跟什么（两个星号表示「任意多层」）
				.addPathPatterns("/api/**")
				// 不管哪些：登录（没登录的人要能进来）、hello（最开始那个测试接口）
				.excludePathPatterns("/api/auth/login", "/api/hello");
	}
}
