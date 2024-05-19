---
title: 46. Token Line Numbers
---

## commit log

```plaintext
Precompute line number for each token

No functionality change
```

主要是为了错误提示的方便，在词法分析阶段就给每个token添加上文件的行数。否则每一次都要扫描整个文件，实在是显得麻烦。

## 头文件

在Token结构体中添加`line_no`字段：

```c
struct Token {
  // other fields

  int line_no;   // Line number
};
```

## Lexer

修改其中的`verror_at`函数：

```c++
static void verror_at(int line_no, char *loc, char *fmt, va_list ap) {
}
```

之后删掉原先获取`line_no`的代码段即可。

然后对于调用`verror_at`的`error_at`函数，把原先在`verror_at`中获取`line_no`的代码段，移动到`error_at`的开头中来（因为`error_at`这个函数指向的是字符串的位置）：

```c++
void error_at(char* loc, char* fmt, ...) {
  int line_no = 1;
  for(char *p = current_input; p < loc; p++) {
    if (*p == '\n')
      line_no ++;
  }
  // code
  verror_at(line_no, loc, fmt, ap);
}
```

然后，添加一个`add_line_numbers`函数，对每一个`token`的`line_no`进行赋值，不过注意这里我们是一次性把整个文件内的所有token全部处理完毕的。

```c
static void add_line_numbers(Token *tok) {
  char* p = current_input;
  int n = 1;
  do {
    if (p == tok->loc) {
      tok->line_no = n;
      tok = tok->next;
    }
    if (*p == '\n') 
      n++;
  } while(*p++);
}
```

最后我们在tokenize函数的最后调用这个`add_line_numbers`函数即可。

```c
static Token *tokenize(char *filename, char* p) {
  // codes
  add_line_numbers(head.next);
  return head.next;
}
```

‍
