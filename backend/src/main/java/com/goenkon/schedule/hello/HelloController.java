// =====================================================================
// HelloController.java：第一个接口  GET /api/hello
//
// 目的：先不碰数据库，只搞懂「一个请求从浏览器进来，到 JSON 返回去」这一整圈。
//
// 浏览器打开 http://localhost:8080/api/hello?name=Goen 时，发生了什么：
//   1. 浏览器把请求发到你电脑的 8080 端口。
//   2. 操作系统发现 8080 端口属于我们的 Java 进程，把数据交给它。
//   3. 进程里的 Tomcat（Web 服务器）收到请求，从线程池里拿一个工作线程
//      （日志里的 nio-8080-exec-1 就是它）来处理这个请求。
//   4. Tomcat 把请求交给 Spring 的 DispatcherServlet（总调度员）。
//   5. 总调度员查自己的「路由表」：GET + /api/hello → 对应 HelloController 的 hello 方法。
//      （路由表是启动时 Spring 扫描 @RestController、@GetMapping 这些注解建立的）
//   6. 调用 hello 方法；网址里的 ?name=Goen 自动变成方法参数 name = "Goen"。
//   7. 方法返回一个 HelloResponse 对象（在 JVM 的内存里）。
//   8. Spring 用 Jackson 把这个对象转成 JSON 文字：{"message":"Hello, Goen!","time":"..."}
//   9. Tomcat 把 JSON 写回给浏览器，工作线程处理完了，回到线程池等下一个请求。
// =====================================================================

// 这个类放在 com.goenkon.schedule.hello 包里（文件夹 hello/）。
// 它在启动类所在的 com.goenkon.schedule 下面，所以启动时会被 Spring 扫描到。
// 以后每个功能一个包：employee/、schedule/、request/……（按功能分包，找代码时更方便）
package com.goenkon.schedule.hello;

// OffsetDateTime：Java 自带的「日期时间 + 时区偏移」类（java.time 包，Java 8 开始有）。
// 用来在返回结果里放一个服务器当前时间，证明这个结果是现场算出来的，不是写死的。
import java.time.OffsetDateTime;

// 下面四个都是 Spring Web MVC 提供的注解（来自 pom.xml 里的 spring-boot-starter-webmvc）
// GetMapping：把一个方法绑定到「GET 请求 + 某个路径」上
import org.springframework.web.bind.annotation.GetMapping;
// RequestMapping：给整个类的所有接口加一个统一的路径前缀
import org.springframework.web.bind.annotation.RequestMapping;
// RequestParam：把网址 ? 后面的参数（查询参数）取出来，变成方法的参数
import org.springframework.web.bind.annotation.RequestParam;
// RestController：标记「这个类是处理 HTTP 请求的，并且返回值直接转成 JSON」
import org.springframework.web.bind.annotation.RestController;

// @RestController：告诉 Spring 两件事
//   1. 这是一个 Controller（控制器）：负责接 HTTP 请求的那一层。
//      Spring 启动时会自动 new 一个 HelloController 对象，放进 Spring 容器里管理，
//      我们自己不用（也不应该）写 new HelloController()。
//   2. 方法的返回值不是「网页模板的名字」，而是要直接写进响应里的数据，
//      对象会被自动转成 JSON。（REST 接口都这样用）
@RestController
// @RequestMapping("/api")：这个类里所有接口的网址都以 /api 开头。
// 下面 @GetMapping("/hello") 和它拼起来，完整路径就是 /api/hello。
// 统一用 /api 开头，是为了和前端页面的网址区分开，以后配开发代理也方便（只转发 /api 开头的请求）。
@RequestMapping("/api")
public class HelloController {

	// 返回给前端的数据长什么样：这里用 record（Java 16 开始有的「数据类」）。
	//   record HelloResponse(String message, String time) 这一行，Java 会自动帮你生成：
	//   - 两个 private final 字段 message 和 time（创建以后就不能改）
	//   - 构造方法 new HelloResponse("...", "...")
	//   - 读取方法 message() 和 time()
	// Jackson 转 JSON 时，会用这两个字段名当 JSON 的 key：{"message": ..., "time": ...}
	// public：让 Jackson（Spring 外面的库）也能访问它。
	// 写在 HelloController 里面（嵌套类型），因为只有这个接口用它；以后的接口会单独放一个文件。
	public record HelloResponse(String message, String time) {
	}

	// @GetMapping("/hello")：浏览器发来「GET /api/hello」时，调用下面这个方法。
	//   GET 是 HTTP 的一种请求方法，意思是「我要读取数据」（浏览器地址栏打开网页用的就是 GET）。
	//   以后还会用 POST（新建）、PUT（修改）、DELETE（删除）。
	@GetMapping("/hello")
	// 方法签名：
	//   public            → 公开，Spring 才能调用它
	//   HelloResponse     → 返回值类型：返回一个 HelloResponse 对象（Spring 会把它转成 JSON）
	//   hello             → 方法名（随便起，Spring 是按注解找方法的，不看名字）
	//   @RequestParam(defaultValue = "World") String name
	//     → 从网址里取 name 参数：/api/hello?name=Goen → name = "Goen"
	//     → 网址里没写 name 时，用默认值 "World"（不写 defaultValue 的话，缺参数会直接返回 400 错误）
	public HelloResponse hello(@RequestParam(defaultValue = "World") String name) {
		// new HelloResponse(...)：在 JVM 的堆内存里创建一个新对象。
		//   第一个值：用 + 把字符串拼起来，比如 "Hello, Goen!"
		//   第二个值：OffsetDateTime.now() 取服务器当前时间（带时区，比如 +09:00），
		//            .toString() 把它变成 "2026-11-03T14:40:12.345+09:00" 这样的文字
		// return：把这个对象交还给 Spring，由 Spring 转成 JSON 返回给浏览器。
		// 方法结束后，这个对象没人再用了，之后会被 JVM 的垃圾回收（GC）自动清掉。
		return new HelloResponse("Hello, " + name + "!", OffsetDateTime.now().toString());
	}
}
