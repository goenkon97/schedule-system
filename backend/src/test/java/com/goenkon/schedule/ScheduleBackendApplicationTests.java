// =====================================================================
// ScheduleBackendApplicationTests.java：Spring Initializr 自动生成的「冒烟测试」
//
// 冒烟测试（smoke test）：最基本的检查 ——「程序能不能正常启动」。
// 这个名字来自硬件：新电路板第一次通电，先看会不会冒烟，不冒烟再测别的功能。
//
// 测试代码放在 src/test/java 下面，和正式代码（src/main/java）分开：
//   - 打包上线时不会包含测试代码
//   - 包名和正式代码一样（com.goenkon.schedule），所以测试能直接用正式代码里的类
//
// 怎么运行：IntelliJ 里点类名或方法名左边的绿色三角，或者终端 ./mvnw test
// 注意：这个测试会真的启动整个程序（包括连接数据库），
//       所以运行前 Docker 里的 MySQL（schedule-mysql）必须是开着的，否则测试会失败。
// =====================================================================

// 和正式代码同一个包
package com.goenkon.schedule;

// @Test 注解：来自 JUnit 5（Java 最常用的测试框架，JUnit 5 也叫 JUnit Jupiter）。
// 贴在方法上，表示「这是一个测试方法」，运行测试时 JUnit 会自动找到并执行它。
import org.junit.jupiter.api.Test;
// @SpringBootTest 注解：来自 Spring Boot 的测试工具包（pom.xml 里 scope 为 test 的那几个依赖）。
import org.springframework.boot.test.context.SpringBootTest;

// @SpringBootTest：运行这个测试类之前，先把整个 Spring 程序启动起来
// （和 main 方法启动时做的事情一样：读配置、扫描类、创建对象、连数据库），
// 启动完再执行下面的测试方法。
@SpringBootTest
// 测试类不用写 public（JUnit 5 允许包内可见），所以这里直接写 class
class ScheduleBackendApplicationTests {

	// @Test：这是一个测试方法
	@Test
	// contextLoads = 「Spring 容器（context）能不能加载成功」。
	// 方法体是空的，因为要测的事情在 @SpringBootTest 启动时就已经测完了：
	//   - 启动过程中任何一步出错（配置写错、数据库连不上、两个类互相依赖……），测试就失败（红色）
	//   - 顺利启动，这个空方法执行完，测试就通过（绿色）
	void contextLoads() {
	}

}
