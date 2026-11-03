// =====================================================================
// ScheduleBackendApplication.java：整个后端的「启动类」，程序从这里开始运行
//
// 运行它时，电脑上发生了什么（按顺序）：
//   1. 你在 IntelliJ 点运行（或者终端 ./mvnw spring-boot:run），
//      操作系统启动一个新的「进程」：JVM（Java 虚拟机）。
//      JVM 是一个程序，专门负责运行编译好的 Java 代码（.class 文件）。
//   2. JVM 找到这个类的 main 方法，从它的第一行开始执行。
//   3. main 里只有一句：SpringApplication.run(...)，把控制权交给 Spring Boot。
//   4. Spring Boot 开始干活：
//      - 读配置文件 application.properties（数据库地址、端口……）
//      - 扫描 com.goenkon.schedule 这个包和它下面所有子包里的类，
//        找到带 @RestController、@Service、@Repository 这些注解的类，
//        帮我们 new 出对象，放进一个叫「Spring 容器」的大盒子里统一管理（这叫控制反转 IoC）
//      - 连接 MySQL（建好数据库连接池）
//      - 启动内置的 Tomcat 服务器，占住 8080 端口，开始等 HTTP 请求
//   5. main 方法执行完了，但进程不会结束：Tomcat 会一直在后台等请求，
//      直到你点停止（或按 Ctrl + C）。所以后端程序是「一直在运行」的。
// =====================================================================

// package：这个类属于哪个「包」（相当于文件夹 + 命名空间）。
// 必须和文件所在的文件夹对得上：src/main/java/com/goenkon/schedule/ → com.goenkon.schedule
// 包名的作用：不同包里可以有同名的类，不会冲突（比如 Spring 有个 Application，我们也可以有）。
package com.goenkon.schedule;

// import：用别的包里的类之前，要先「引入」（和前端的 import 是一个意思）。
// SpringApplication：Spring Boot 提供的类，它的 run 方法负责把整个 Spring 程序启动起来。
import org.springframework.boot.SpringApplication;
// SpringBootApplication：一个注解（下面 @ 开头的那个），定义在 Spring Boot 的 autoconfigure 包里。
import org.springframework.boot.autoconfigure.SpringBootApplication;

// @SpringBootApplication：贴在启动类上的「标签」（注解），告诉 Spring Boot「这就是主程序」。
// 注解本身不执行任何代码，它只是一个标记；Spring 启动时会读这些标记，再决定怎么做。
// 它其实是三个注解合在一起：
//   @SpringBootConfiguration → 这个类本身也是一个配置类
//   @EnableAutoConfiguration → 开启「自动配置」：看你引入了哪些依赖，自动配好对应的东西
//                              （引入了 webmvc → 自动配 Tomcat；引入了 JPA + MySQL 驱动 → 自动配数据库连接）
//   @ComponentScan           → 从这个类所在的包（com.goenkon.schedule）开始，往下扫描所有子包，
//                              找带注解的类交给 Spring 管理。
//                              所以以后写的类都要放在 com.goenkon.schedule 下面，放到别的包里就扫不到。
@SpringBootApplication
// public：公开的，别的地方都能用；class：定义一个类；类名必须和文件名一模一样。
public class ScheduleBackendApplication {

	// main 方法：Java 程序的入口，JVM 启动后第一个执行的方法。写法是固定的，一个字都不能错：
	//   public  → 公开，JVM 才能从外面调用它
	//   static  → 静态方法：不用先 new 一个 ScheduleBackendApplication 对象就能调用
	//             （程序刚启动时还没有任何对象，所以入口必须是 static）
	//   void    → 这个方法不返回任何值
	//   String[] args → 启动时从命令行传进来的参数（比如 --server.port=9090），是一个字符串数组
	public static void main(String[] args) {
		// 启动 Spring Boot：
		//   第一个参数 ScheduleBackendApplication.class → 告诉 Spring「主配置类是这个」，
		//     它会读这个类上的 @SpringBootApplication，从这个类所在的包开始扫描。
		//     .class 表示「这个类本身」（类的说明书），而不是它的某个对象。
		//   第二个参数 args → 把命令行参数原样传给 Spring，让 --server.port=9090 这种设置生效。
		// 这一行执行完，Tomcat 已经在 8080 端口上等着请求了。
		SpringApplication.run(ScheduleBackendApplication.class, args);
	}

}
