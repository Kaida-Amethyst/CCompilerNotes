---
title: 35. Utility Functions
---

## commit log

```plaintext
Refactoring: Add a utility function
```

这一次commit来轻松一下。我们上次的commit中对`new_unique_name`的实现有些特殊，考虑到我们今后可能要多复用这段逻辑，我们单独写一个函数用来处理。

## strings.c

新建一个`strings.c`的文件，其中实现一个format函数，这个函数的作用就是得到一个string，但是它是类似于printf那种的。例如：

```c
char* s = "World!"
char* p = format("Hello %s", s);
printf("%s\n", p);
// Hello World
```

我们来实现这个功能：

```c
char* format(char* fmt, ...) {
  char* buf;
  size_t buflen;
  FILE* out = open_memstream(&buf, &buflen);

  va_list ap;
  va_start(ap, fmt);
  vfprintf(out, fmt, ap);
  va_end(ap);
  fclose(out);
  return buf;
}
```

上面的函数，很多逻辑对于我们现在来说或许还是一个谜，不过没关系，随着我们对C编译器的了解，我们会越来越知晓其中的秘密。

## Parser

把其中的new_unique_name的实现逻辑修改一下：

```c
static char* new_unique_name(void) {
  static int id = 0;
  return format(".L..%d", id++);
}
```

Done~
