buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:9.2.0")
        classpath("org.jetbrains.kotlin:compose-compiler-gradle-plugin:2.2.10")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.2.10")
        classpath("org.jetbrains.kotlin:kotlin-serialization:1.9.20")
    }
}

tasks.register("clean", Delete::class) {
    delete(rootProject.buildDir)
}
