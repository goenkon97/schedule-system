// =====================================================================
// GlobalExceptionHandler.java：全局错误处理 —— 所有接口出错时，统一在这里变成同一种格式
//
// 没有它的话会怎样：
//   Service 里 throw 了一个异常，一路传到 Spring，Spring 会返回它自己默认的错误 JSON，
//   里面只有 {"timestamp": ..., "status": 500, "error": "Internal Server Error", ...}，
//   看不到我们写的「电话已经被使用」，而且状态码都是 500（服务器出错），前端没法区分是什么问题。
//
// 有了它以后：
//   所有接口出错时，返回的都是 {"message": "电话已经被使用"} 这种格式，状态码也是对的（400 / 404 / 409），
//   前端只要写一套处理方式：if (!res.ok) 显示 body.message。
// =====================================================================

package com.goenkon.schedule.common;

// HttpStatus：HTTP 状态码的枚举
import org.springframework.http.HttpStatus;
// ResponseEntity：「一个完整的 HTTP 响应」= 状态码 + 响应头 + 响应体（body）。
//   平时 Controller 直接返回对象，状态码默认是 200；需要自己指定状态码时，就返回 ResponseEntity。
import org.springframework.http.ResponseEntity;
// HttpMessageNotReadableException：请求体的 JSON 读不懂时抛出的异常
//   （JSON 格式写错了，或者 department 传了 "kitchen" 这种枚举里没有的值）
import org.springframework.http.converter.HttpMessageNotReadableException;
// FieldError：某一个字段的校验错误（哪个字段、错误信息是什么）
import org.springframework.validation.FieldError;
// MethodArgumentNotValidException：@Valid 校验没通过时 Spring 抛出的异常（比如名字是空的）
import org.springframework.web.bind.MethodArgumentNotValidException;
// ExceptionHandler：标记「这个方法专门处理某一种异常」
import org.springframework.web.bind.annotation.ExceptionHandler;
// RestControllerAdvice：标记「这个类给所有 @RestController 提供统一的处理」，这里用来统一处理错误
import org.springframework.web.bind.annotation.RestControllerAdvice;

// @RestControllerAdvice：
//   Spring 启动时扫描到它，会把它当成「所有 Controller 共用的帮手」。
//   任何 Controller（以及它调用的 Service）抛出的异常，只要这里有对应的 @ExceptionHandler，就交给这里处理，
//   返回值和 @RestController 一样会被转成 JSON。
@RestControllerAdvice
public class GlobalExceptionHandler {

	// 错误响应的格式：只有一个 message 字段 → JSON 就是 {"message": "..."}
	// （和 docs/api-design.md 里约定的一样）
	public record ErrorResponse(String message) {
	}

	// ---------- ① 我们自己抛的业务错误 ----------
	// @ExceptionHandler(ApiException.class)：只要有 ApiException 被抛出来，就调用这个方法，
	// Spring 会把那个异常对象当成参数 e 传进来。
	@ExceptionHandler(ApiException.class)
	public ResponseEntity<ErrorResponse> handleApi(ApiException e) {
		// ResponseEntity.status(e.getStatus())：用异常里带的状态码（404 / 409 / 400）
		// .body(...)：响应体是 {"message": 异常里的错误信息}
		return ResponseEntity.status(e.getStatus()).body(new ErrorResponse(e.getMessage()));
	}

	// ---------- ② 格式校验没通过（@Valid） ----------
	// 比如名字是空的、电话格式不对。这些规则写在 EmployeeRequest 的注解上（@NotBlank、@Pattern）。
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
		// 一个请求可能有好几个字段都不对，这里只取第一个错误的信息返回（前端一次显示一个就够了）
		//   e.getBindingResult().getFieldErrors() → 所有字段的错误，是一个 List<FieldError>
		//   .stream()                             → 变成「流」，可以像 JS 数组那样链式处理
		//   .findFirst()                          → 取第一个（结果是 Optional：可能有，也可能没有）
		//   .map(FieldError::getDefaultMessage)   → 只要它的错误信息（就是注解里写的 message）
		//                                           FieldError::getDefaultMessage 是「方法引用」，
		//                                           等于 JS 的 (err) => err.getDefaultMessage()
		//   .orElse("...")                        → 万一一个都没有，就用这句默认的
		String message = e.getBindingResult().getFieldErrors().stream()
				.findFirst()
				.map(FieldError::getDefaultMessage)
				.orElse("请求的数据不正确");
		// ResponseEntity.badRequest()：状态码 400
		return ResponseEntity.badRequest().body(new ErrorResponse(message));
	}

	// ---------- ③ 请求体的 JSON 读不懂 ----------
	// 比如 JSON 少了一个括号，或者 department 传了 "kitchen"（小写，枚举里没有这个值）
	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorResponse> handleUnreadable(HttpMessageNotReadableException e) {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
				.body(new ErrorResponse("请求的 JSON 格式不对，或者部门、职位等字段的值不在允许的范围内"));
	}
}
