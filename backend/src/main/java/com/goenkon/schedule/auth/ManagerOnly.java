// =====================================================================
// ManagerOnly.java：我们自己做的一个注解（标签）—— @ManagerOnly
//
// 大白话：
//   之前用的 @Service、@PostMapping 都是别人做好的标签。这次我们自己做一个。
//   把 @ManagerOnly 贴在 Controller 的某个方法上，意思就是「这个接口只有店长能用」。
//   标签本身什么都不做，它只是一个记号；真正去看这个记号、拦人的是门卫（AuthInterceptor）。
//
// 为什么用标签，而不是在门卫里写一张「哪些网址要店长」的清单？
//   规则就贴在接口旁边：打开 EmployeeController，一眼就看到哪些方法只有店长能用；
//   以后加新接口，顺手贴一个标签就行，不用跑去另一个文件改清单（很容易忘）。
// =====================================================================

package com.goenkon.schedule.auth;

// ElementType：标签能贴在哪里（类上、方法上、字段上……）
import java.lang.annotation.ElementType;
// Retention / RetentionPolicy：标签要保留到什么时候
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
// Target：配合 ElementType，规定标签能贴的位置
import java.lang.annotation.Target;

// @Target(ElementType.METHOD)：这个标签只能贴在「方法」上（贴在类上、字段上会编译报错）
@Target(ElementType.METHOD)
// @Retention(RetentionPolicy.RUNTIME)：标签要一直保留到「程序运行的时候」。
//   默认情况下，有些标签编译完就被扔掉了，运行时看不到。
//   门卫是在程序运行时、每个请求进来的那一刻去看这个标签的，所以必须保留到运行时。
@Retention(RetentionPolicy.RUNTIME)
// @interface：Java 里「定义一个注解」的写法（注意和接口 interface 不一样，前面多了一个 @）。
//   里面什么都不用写：我们只需要「贴了 / 没贴」这一个信息
public @interface ManagerOnly {
}
