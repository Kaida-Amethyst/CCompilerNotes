---
title: 40. File Input Handling
---

## commit log

```plaintext
Read code from a file instead of argv[1]
```

从这一次commit开始，我们要从一个文本文件中读取我们的代码。不过为了兼容我们原先的测例，我们要求也可以从标准输入中读取代码。

另外，由于现在是从文件中读取了，一些错误处理的函数现在也需要重新修改了。

## 头文件

添加一个函数`tokenize_file`，同时去掉`tokenize`函数，这个函数变为static。

```c
#include <errno.h>

Token* tokenize_file(char* filename);
```

## tokenize_file

然后我们来实现这个函数，这里我们只是让其调用`tokenize`，具体的实现还是要修改`tokenize`。

```c
Token* tokenize_file(char* path) {
  return tokenize(path, read_file(path));
}
```

我们先来实现其中的`read_file`，注意为了兼容旧的测例，我们约定如果`path`是`-`的话，从stdin中读取代码。

```c
static char* read_file(char* path) {
  FILE* fp;
  if (0 == strcmp(path, "-")) {
    fp = stdin;
  } else {
    fp = fopen(path, "r");
    if (!fp)
      error("cannot open %s: %s", path, strerror(errno));
  }

  char* buf;
  size_t buflen;
  FILE* out = open_memstream(&buf, &buflen);

  // 先把文件里面的内容读取到buf2里面，
  // 再利用fwrite把buf2离得内容写入到out里
  for(;;) {
    char buf2[4096];
    int n = fread(buf2, 1, sizeof(buf2), fp);
    if (n == 0)
      break;
    fwrite(buf2, 1, n, out)
  }

  if(fp != stdin) {
    fclose(fp);
  }
  // 确保out中的最后一个字符是\n\0
  fflush(out);
  if (buflen == 0 || buf[buflen - 1] != '\n')
    fputc('\n', out);
  fputc('\0', out);
  fclose(out);
  return buf;
}
```

然后我们来修改`tokenize`函数，我们首先添加一个`current_filename`的全局变量。

```c
static char* current_filename;
```

然后修改一下`tokenize`函数的定义，另外，添加上对`current_filename`的赋值：

```c
static Token* tokenize(char* filename, char* p) {
  current_filename = filename;
  /*  other codes  */
}
```

## error信息

除此之外，原先的报错信息仅仅是处理标准输入中的文本，这一次我们需要来处理文本中的代码，主要是修改`verror_at`。

原先的`verror_at`是把错误的代码先打印出来，然后再输出错误信息，这里我们要把文件名和行号也一并打印出来。

```c
static void verror_at(char* loc, char* fmt, va_list ap) {
  // 向前搜索，到这一行的行首
  char* line = loc;
  while(current_input < line && line[-1] != '\n')
    line -- ;
  // 向后搜索，到这一行的末尾
  char* end = loc;
  while(*end != '\n')
    end ++;

  // 从current_input起，到line，计数\n的个数，就是错误
  // 发生位置的行数
  int line_no = 1;
  for(char* p = current_input; p < line; p++) {
    if (*p == '\n')
      line_no++;
  }
  int indent = fprintf(stderr, "%s:%d: ", current_filename, line_no);
  fprintf(stderr, "%.*s\n", (int)(end - line), line);

  int pos = loc - line + indent;
  // 下面的就是原先代码里就有的了
  fprintf(stderr, "%*s", pos, "");
  fprintf(stderr, "^ ");
  vfprintf(stderr, fmt, ap);
  fprintf(stderr, "\n");
  exit(1);
}
```

当然，不要忘记修改main函数。

‍
