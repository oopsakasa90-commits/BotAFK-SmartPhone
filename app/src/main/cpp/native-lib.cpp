#include <jni.h>
#include <string>
#include <cstdlib>
#include <cstring>
#include "node.h"

extern "C" JNIEXPORT jint JNICALL
Java_com_secretaf_app_NodeService_startNodeWithArguments(JNIEnv *env, jobject, jobjectArray arguments) {
    jsize argc = env->GetArrayLength(arguments);
    int total = 0;
    for (int i = 0; i < argc; i++) {
        jstring s = (jstring) env->GetObjectArrayElement(arguments, i);
        const char *c = env->GetStringUTFChars(s, nullptr);
        total += (int) strlen(c) + 1;
        env->ReleaseStringUTFChars(s, c);
    }
    char *buf = (char *) calloc(total + 1, sizeof(char));
    char **argv = (char **) calloc(argc + 1, sizeof(char *));
    char *pos = buf;
    for (int i = 0; i < argc; i++) {
        jstring s = (jstring) env->GetObjectArrayElement(arguments, i);
        const char *c = env->GetStringUTFChars(s, nullptr);
        size_t n = strlen(c);
        memcpy(pos, c, n);
        argv[i] = pos;
        pos += n + 1;
        env->ReleaseStringUTFChars(s, c);
    }
    return (jint) node::Start((int) argc, argv);
}
