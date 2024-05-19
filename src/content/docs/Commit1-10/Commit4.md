---
title: 4. Error Messaging
---

## Commit log

```plaintext
Improve error message
  
    Now, chibicc can print out an error message with an error location
    like this:
  
      $ ./chibicc 1+foo
      1+foo
        ^ expected a number
```

我们的表达式可能会发生错误，那么我们这一个commit就要添加提示，指出哪里发生了错误。

## 思路

对于这种简单表达式来说，能发生错误的应该只有两种场景，一是在tokenize的时候，识别到了异常的符号，譬如我们这里应该只有数字和`+`和`-`号，如果出现了`*`或`\`自然就要报错。二是在扫描token链表的时候，有可能发生异常，譬如表达式中出现了连续的数字`123 4 5`这种情况是要报错的。

## 做法

我们把整个字符串的指针做成一个全局变量：

```c
static char* current_input;
```

然后把`tokenize`这个函数稍作修改，让它直接处理这个全局的`current_input`，因为我们别的函数也需要使用这个全局的字符指针，因此需要统一。

```c
static Token *tokenize(void) {
  char *p = current_input;
  /*
    other code
  */
}
```

在`tokenize`的过程中，可能会碰上非法字符，从而报错。我们这里先写一个通用的报错信息提示，当需要报错的时候，首先把整个表达式打印出来，然后记录错误位置，接着第二行在错误位置处打印一个小箭头和错误提示信息。

```c
static void verror_at(char *loc, char* fmt, va_list ap) {
  int pos = loc - current_input;
  fprintf(stderr, "%s\n", current_input);
  fprintf(stderr, "%*s", pos, "");
  fprintf(stderr, "^");
  vfprintf(stderr, fmt, ap);
  fprintf(stderr, "\n");
  exit(1);
}
```

然后我们写在tokenize过程中需要调用的报错函数：

```c
static void error_at(char *loc, char *fmt, ...) {
  va_list ap;
  va_start(ap, fmt);
  verror_at(loc, fmt, ap);
}
```

以及在扫描token时需要调用的报错函数：

```c
static void error_tok(Token *tok, char *fmt, ...) {
  va_list ap;
  va_start(ap, fmt);
  verror_at(tok->loc, fmt, ap);
}
```

之后，在对应位置上，将原先用error报错的地方，替换成使用`error_at`或者`error_tok`。这里不赘述了。

最后别忘了修改`main`函数，因为我们把`tokenize`的定义改了。

这样就完成了。

手动测试一下：

```shell
$ ./chibicc ' 1 + 3.14'
 1 + 3.14
      ^invalid token
```

‍
