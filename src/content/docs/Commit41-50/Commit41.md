---
title: 41. Code Refactoring
---

## commit log

```plaintext
Refactor -- no functionality change
```

这一次commit比较简单，可以稍微轻松一下，就是在codegen里实现了一个println函数，自动把要print的内容加了一个换行符，然后把所有用到printf的地方都给换成println了。

## Codegen

```c
static void println(char* fmt, ...) {
  va_list ap;
  va_start(ap, fmt);
  vprintf(fmt, ap);
  va_end(ap);
  printf("\n");
}
```

然后把codegen里面所有的printf换成println即可。

‍
