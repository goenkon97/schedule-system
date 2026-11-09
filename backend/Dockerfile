# =====================================================================
# Dockerfile：告诉 Docker「怎么把这个后端装进一个集装箱（镜像）」
#
# Render 拿到代码后，会照着这个文件一步一步执行，做出一个镜像，再用它启动程序。
# 写成「两个阶段」（multi-stage）：
#   第 1 阶段（build）：用装了 Maven + JDK 的大镜像，把代码编译、打包成一个 jar
#   第 2 阶段（运行）：换一个只装了 JRE（只能运行、不能编译）的小镜像，只把 jar 拷过去
#   好处：最后的镜像里没有 Maven、没有源代码、没有下载的一大堆编译工具，体积小、启动快
# =====================================================================

# ---------- 第 1 阶段：编译打包 ----------
# FROM：从哪个现成的镜像开始。maven:3.9-eclipse-temurin-21 = Maven 3.9 + Java 21（和 pom.xml 里的 java.version 一致）
# AS build：给这个阶段起个名字，第 2 阶段要从它这里拿 jar
FROM maven:3.9-eclipse-temurin-21 AS build
# WORKDIR：之后的命令都在镜像里的 /app 文件夹里执行（没有就自动建）
WORKDIR /app
# 先只拷 pom.xml，下载所有依赖。
#   为什么分两步拷：Docker 会把每一步的结果缓存起来。只改了 Java 代码、没改 pom.xml 时，
#   这一步直接用缓存，不用每次都重新下载几百个依赖，部署快很多。
COPY pom.xml .
# dependency:go-offline：把 pom.xml 里需要的东西全部下载好；-B：不要彩色进度条（日志干净）
RUN mvn -B dependency:go-offline
# 再拷源代码
COPY src ./src
# package：编译 + 打包成 target/schedule-backend-0.0.1-SNAPSHOT.jar
#   -DskipTests：跳过测试（测试在本地跑，部署时只管打包，省时间）
RUN mvn -B package -DskipTests

# ---------- 第 2 阶段：运行 ----------
# 只有 Java 21 运行环境（JRE）的小镜像
FROM eclipse-temurin:21-jre
WORKDIR /app
# 从第 1 阶段（build）里，把打好的 jar 拷过来，改名叫 app.jar
COPY --from=build /app/target/*.jar app.jar
# ENV：设环境变量
#   SPRING_PROFILES_ACTIVE=demo → 打开「演示模式」，读 application-demo.properties（用内存数据库 H2）
ENV SPRING_PROFILES_ACTIVE=demo
# Java 内存设置（Render 免费版只有 512MB 内存）：
#   -XX:MaxRAMPercentage=75 → Java 最多用机器内存的 75%，留一点给系统，避免被系统强制杀掉
#   -XX:+UseSerialGC        → 用最简单、最省内存的垃圾回收方式（小程序、单核机器最合适）
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC"
# EXPOSE：说明「程序在这个端口上等请求」，只是给人看的标注。
#   真正的端口由环境变量 PORT 决定（Render 会自动设），application.properties 里写了 server.port=${PORT:8080}
EXPOSE 8080
# 容器启动时执行的命令：java -jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
