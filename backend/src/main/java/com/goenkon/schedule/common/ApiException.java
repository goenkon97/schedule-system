// =====================================================================
// ApiException.java：「业务错误」—— 请求本身没问题，但违反了业务规则
//   例：找不到这个员工（404）、电话已经被别人用了（409）、厨房员工选了兼职（400）
//
// 为什么要自己定义一个异常类：
//   Service 发现问题时，直接 throw new ApiException(状态码, 错误信息)，
//   不用自己去拼 HTTP 响应；GlobalExceptionHandler 会统一接住它，
//   变成 {"message": "..."} 这种格式返回给前端，前端直接把 message 显示出来。
//
// 异常（Exception）是什么：
//   程序遇到「没法继续往下走」的情况时，用 throw 抛出一个异常对象，
//   当前方法立刻停止，异常一层层往外传（Service → Controller → Spring），
//   直到被某个地方接住（catch 或者 @ExceptionHandler）。没人接住的话程序会报错。
//   和 JavaScript 的 throw new Error("...") 是同一个东西。
// =====================================================================

// common 包：放所有功能（员工、班表、申请）都会用到的东西
package com.goenkon.schedule.common;

// HttpStatus：Spring 提供的枚举，列出了所有 HTTP 状态码（404 NOT_FOUND、409 CONFLICT……）
import org.springframework.http.HttpStatus;

// extends RuntimeException：继承 Java 自带的「运行时异常」。
//   Java 的异常分两种：
//     - 受检异常（Exception）：调用的地方必须写 try-catch 或者在方法上声明 throws，不然编译不过
//     - 运行时异常（RuntimeException）：不强制处理，可以一直往外传
//   业务错误我们希望「一路传到最外面，由 GlobalExceptionHandler 统一处理」，
//   中间的代码不用每层都写 try-catch，所以用 RuntimeException。
public class ApiException extends RuntimeException {

	// 这个错误要返回什么 HTTP 状态码
	// final：在构造方法里赋值以后就不能再改了（一个错误的状态码不应该中途变化）
	private final HttpStatus status;

	// 构造方法：创建一个业务错误
	//   status  → HTTP 状态码
	//   message → 给人看的错误信息（会原样显示在前端）
	public ApiException(HttpStatus status, String message) {
		// super(message)：调用父类 RuntimeException 的构造方法，把 message 交给它保存，
		// 以后用 getMessage() 就能取出来（getMessage 是从父类继承来的方法）
		super(message);
		this.status = status;
	}

	// 读取状态码（给 GlobalExceptionHandler 用）
	public HttpStatus getStatus() {
		return status;
	}

	// ---------- 三个「快捷方法」：让 Service 里的代码读起来更像一句话 ----------
	// static：静态方法，不用先 new 对象，直接 ApiException.notFound("...") 就能调用
	// 返回值是 ApiException 对象本身，调用的地方写 throw ApiException.notFound("...")

	// 404 Not Found：要找的东西不存在（比如 id = 99 的员工）
	public static ApiException notFound(String message) {
		return new ApiException(HttpStatus.NOT_FOUND, message);
	}

	// 409 Conflict：和现有的数据冲突（比如电话已经被别的员工用了）
	public static ApiException conflict(String message) {
		return new ApiException(HttpStatus.CONFLICT, message);
	}

	// 400 Bad Request：请求的数据不符合业务规则（比如厨房员工选了兼职）
	public static ApiException badRequest(String message) {
		return new ApiException(HttpStatus.BAD_REQUEST, message);
	}

	// 401 Unauthorized：「你是谁？」—— 认证失败：邮箱或密码不对、没带通行证（token）、通行证过期或被改过
	//   名字叫 Unauthorized（未授权）是 HTTP 历史上起错的名字，意思其实是「未认证」（还不知道你是谁）
	public static ApiException unauthorized(String message) {
		return new ApiException(HttpStatus.UNAUTHORIZED, message);
	}

	// 403 Forbidden：「我知道你是谁，但你没有这个权限」—— 授权失败：比如员工去调「添加员工」这种店长才能用的接口
	//   和 401 的区别：401 是没证明身份，403 是身份没问题、只是不允许
	public static ApiException forbidden(String message) {
		return new ApiException(HttpStatus.FORBIDDEN, message);
	}
}
