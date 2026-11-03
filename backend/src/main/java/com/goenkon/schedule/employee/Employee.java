// =====================================================================
// Employee.java：员工的 Entity（实体类）
//
// Entity = 「一张表对应一个 Java 类，一行数据对应一个 Java 对象」。
//   MySQL 里的 employees 表           ⇄   Employee 类
//   表里的一行（Tom Lee 的数据）       ⇄   一个 Employee 对象
//   表里的一列（name、phone）          ⇄   类里的一个字段
//
// 我们不用自己写 CREATE TABLE、INSERT、SELECT 这些 SQL：
// Hibernate（JPA 的实现，pom.xml 里 spring-boot-starter-data-jpa 带进来的）会读这个类上的注解，
//   - 启动时：按字段自动建表（application.properties 里设了 ddl-auto=update）
//   - 保存时：把对象翻译成 INSERT / UPDATE 语句
//   - 查询时：把查出来的每一行，变回一个 Employee 对象
//
// 这里的字段和前端 src/data/employees.ts 的 Employee 类型一一对应，
// 多了 deleted（软删除标记）和 createdAt / updatedAt（创建、修改时间）。
// 登录用的 email、密码以后做登录时再加（ddl-auto=update 会自动给表加上新的列）。
// =====================================================================

package com.goenkon.schedule.employee;

// Instant：Java 的「时间点」类型（某一瞬间，和时区无关，内部存的是 UTC 时间）。
// 用来记创建、修改时间。存进 MySQL 会变成 datetime(6) 类型的列。
import java.time.Instant;

// 下面这些注解都来自 jakarta.persistence，也就是 JPA（Jakarta Persistence API）规范：
// 一套「Java 对象怎么对应数据库表」的标准写法。Hibernate 是这个标准的实现。
// （以前叫 javax.persistence，Spring Boot 3 开始改名为 jakarta.persistence，网上老教程里看到 javax 是同一个东西）
// Column：设置一个字段对应的列（列名、能不能为空、长度……）
import jakarta.persistence.Column;
// Entity：标记「这个类是一张表」
import jakarta.persistence.Entity;
// EnumType：枚举存进数据库时，存「名字」还是「序号」
import jakarta.persistence.EnumType;
// Enumerated：标记「这个字段是枚举」，配合 EnumType 使用
import jakarta.persistence.Enumerated;
// GeneratedValue：主键的值由数据库自动生成
import jakarta.persistence.GeneratedValue;
// GenerationType：主键怎么生成（IDENTITY = 数据库的自增）
import jakarta.persistence.GenerationType;
// Id：标记「这个字段是主键」
import jakarta.persistence.Id;
// PrePersist：标记一个方法「在第一次存进数据库（INSERT）之前自动调用」
import jakarta.persistence.PrePersist;
// PreUpdate：标记一个方法「在修改（UPDATE）之前自动调用」
import jakarta.persistence.PreUpdate;
// Table：设置这个类对应的表名
import jakarta.persistence.Table;

// @Entity：告诉 JPA「这个类对应数据库里的一张表」。
// Spring Boot 启动时会扫描到它（日志里 Hibernate 那几行），并按 ddl-auto=update 检查表是否存在、缺不缺列。
@Entity
// @Table(name = "employees")：表名叫 employees。
// 不写的话表名默认就是类名（employee）。表名用复数是常见的命名习惯：表里装的是「很多个员工」。
@Table(name = "employees")
public class Employee {

	// ---------- 主键 ----------
	// @Id：这是主键。主键 = 每一行的唯一编号，用它来找到某一行（GET /api/employees/3 里的 3）。
	@Id
	// @GeneratedValue(strategy = GenerationType.IDENTITY)：
	//   主键不由我们填，INSERT 时让 MySQL 自动生成：1、2、3……（MySQL 的 AUTO_INCREMENT 自增）
	//   所以新建员工时 id 是 null，保存以后才有值。
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	// private：只有这个类自己能直接访问这个字段，外面要通过下面的 getId() 来读（封装）。
	// Long（大写 L，包装类型）而不是 long：因为保存之前 id 是「还没有」，需要能是 null；long 不能是 null。
	// 对应的列：id BIGINT（64 位整数，最大约 922 亿亿，用不完）
	private Long id;

	// ---------- 基本信息 ----------
	// @Column(nullable = false, length = 40)：
	//   nullable = false → 建表时加 NOT NULL：数据库层面保证一定有名字
	//   length = 40      → VARCHAR(40)：最多 40 个字符（和前端表单的 maxLength 一致）
	@Column(nullable = false, length = 40)
	private String name;

	// 电话：最多 20 个字符。
	// 这里故意不加 unique（唯一约束）：员工被删除时我们只是标记 deleted = true，不真正删掉这一行，
	// 如果加了唯一约束，被删掉的员工的电话就再也不能给新员工用了。
	// 「在职员工之间电话不能重复」这条规则，放在 EmployeeService 里检查。
	@Column(nullable = false, length = 20)
	private String phone;

	// @Enumerated(EnumType.STRING)：枚举存成它的名字（"Kitchen"），而不是序号（0）。
	//   一定要用 STRING：如果存序号，以后在枚举中间插一个新值，所有旧数据的意思就全乱了；
	//   而且打开数据库直接看到 "Kitchen"，比看到 0 好懂得多。
	// length = 20：列的类型是 VARCHAR(20)
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Department department;

	// 职位（Chef、Server……），同样存名字
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Position position;

	// 雇佣类型（fullTime / partTime）。
	// Java 里字段名是 employment，Hibernate 会把驼峰命名自动转成下划线：列名还是 employment；
	// 像下面的 createdAt 就会变成 created_at（数据库的列名习惯用下划线）。
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private EmploymentType employment;

	// 状态（active / onLeave）
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private EmployeeStatus status;

	// ---------- 软删除 ----------
	// 删除员工时不执行 DELETE，而是把这个字段改成 true（「软删除」）。
	// 原因：以前的班表里还记着这个员工的 id，真删掉的话，旧班表就找不到这个人是谁了。
	// 查员工列表时，只查 deleted = false 的（见 EmployeeRepository）。
	// boolean（小写，基本类型）：只有 true / false，不会是 null；默认值 false。
	// 对应的列：deleted BIT(1) NOT NULL（MySQL 里用 1 / 0 表示）
	@Column(nullable = false)
	private boolean deleted = false;

	// ---------- 创建 / 修改时间 ----------
	// updatable = false：这一列只在 INSERT 时写入，以后 UPDATE 不会改它（创建时间不应该变）
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	// ---------- 构造方法 ----------
	// protected Employee() {}：一个什么都不做的「无参构造方法」。
	// JPA 规定 Entity 必须有它：Hibernate 从数据库查出一行数据后，
	// 要先用这个构造方法 new 一个空对象，再把每一列的值一个个填进字段里。
	// 写成 protected（而不是 public），是为了提醒自己：业务代码里不要用它造「空员工」，
	// 应该用下面那个带参数的构造方法。
	protected Employee() {
	}

	// 新建员工时用的构造方法：一次把所有必填的信息都传进来，
	// 这样就不会造出「有名字但没有部门」这种不完整的对象。
	// id、deleted、createdAt、updatedAt 不用传：分别由数据库、默认值、下面的 onCreate() 来设置。
	public Employee(String name, String phone, Department department, Position position,
			EmploymentType employment, EmployeeStatus status) {
		// this.name 指「这个对象的 name 字段」，右边的 name 指「传进来的参数」。
		// 两个名字一样，所以要用 this. 来区分。
		this.name = name;
		this.phone = phone;
		this.department = department;
		this.position = position;
		this.employment = employment;
		this.status = status;
	}

	// ---------- 自动记时间 ----------
	// @PrePersist：Hibernate 每次要 INSERT 这个对象之前，会自动调用这个方法。
	// 所以我们永远不用手动设置创建时间，也不会忘记设。
	@PrePersist
	void onCreate() {
		// Instant.now()：取当前时间
		Instant now = Instant.now();
		this.createdAt = now;
		this.updatedAt = now;
	}

	// @PreUpdate：Hibernate 每次要 UPDATE 这个对象之前自动调用：更新「最后修改时间」
	@PreUpdate
	void onUpdate() {
		this.updatedAt = Instant.now();
	}

	// ---------- 修改信息 ----------
	// 编辑员工时用：一次改掉所有可以改的信息。
	// 为什么不给每个字段都写一个 setXxx？
	//   如果到处都能 setDepartment、setEmployment，就可能出现「只改了部门没改职位」的半截状态。
	//   把「修改」收进一个方法里，以后要加规则（比如记录修改历史）只改这一处。
	// 注意：这里只是改了内存里这个对象的字段，还没有写进数据库。
	// 在 Service 的事务里调用它，事务结束时 Hibernate 会发现对象变了，自动执行 UPDATE（这叫「脏检查」）。
	public void update(String name, String phone, Department department, Position position,
			EmploymentType employment, EmployeeStatus status) {
		this.name = name;
		this.phone = phone;
		this.department = department;
		this.position = position;
		this.employment = employment;
		this.status = status;
	}

	// 软删除：只是把标记改成 true（同样是事务结束时自动 UPDATE）
	public void markDeleted() {
		this.deleted = true;
	}

	// ---------- getter：给外面读字段用 ----------
	// 字段是 private 的，外面不能直接访问，所以每个字段提供一个 public 的读取方法。
	// 命名规则：get + 字段名首字母大写；boolean 类型用 is 开头（isDeleted）。
	// Jackson 转 JSON 时、Hibernate 读数据时，都认这个命名规则。
	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public String getPhone() {
		return phone;
	}

	public Department getDepartment() {
		return department;
	}

	public Position getPosition() {
		return position;
	}

	public EmploymentType getEmployment() {
		return employment;
	}

	public EmployeeStatus getStatus() {
		return status;
	}

	public boolean isDeleted() {
		return deleted;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
