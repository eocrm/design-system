plugins {
    kotlin("multiplatform") version "2.4.10"
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.10"
    id("org.jetbrains.compose") version "1.11.1"
    id("com.android.kotlin.multiplatform.library") version "9.1.0"
    `maven-publish`
}

group = "com.eocrm.design"
version = providers.gradleProperty("version").orElse("0.0.0-dev").get()

kotlin {
    jvm()
    android {
        namespace = "com.eocrm.design.tokens"
        compileSdk = 36
        minSdk = 21
        withHostTestBuilder {}.configure {}
    }
    iosArm64()
    iosSimulatorArm64()

    sourceSets {
        commonMain.dependencies {
            implementation("org.jetbrains.compose.runtime:runtime:1.11.1")
            implementation("org.jetbrains.compose.ui:ui:1.11.1")
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
        }
    }
}

publishing {
    val githubActor = System.getenv("GITHUB_ACTOR")
    val githubToken = System.getenv("GITHUB_TOKEN")
    if (!githubActor.isNullOrBlank() && !githubToken.isNullOrBlank()) {
        repositories {
            maven {
                name = "GitHubPackages"
                url = uri("https://maven.pkg.github.com/eocrm/design-system")
                credentials {
                    username = githubActor
                    password = githubToken
                }
            }
        }
    }
}
