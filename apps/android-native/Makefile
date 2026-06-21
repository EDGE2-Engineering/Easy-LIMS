.PHONY: help build-debug build-release clean install-debug

help:
	@echo "Usage:"
	@echo "  make build-debug    - Build the debug APK"
	@echo "  make build-release  - Build the release APK"
	@echo "  make clean          - Clean the project"
	@echo "  make install-debug  - Build and install the debug APK on a connected device"

build-debug:
	./gradlew assembleDebug

build-release:
	./gradlew assembleRelease

clean:
	./gradlew clean

install-debug:
	./gradlew installDebug
