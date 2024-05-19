---
title: 73. Character Literals
---

## commit log

```plaintext
Add character literal
```

添加字符类型。只需要把一个单字符解释成一个整数即可。即修改lexer。

## Lexer

```c
static Token *read_char_literal(char *start) {
  char *p = start + 1;
  if (*p == '\0') {
    error_at(start, "unclosed char literal");
  }
  char c;
  if (*p == '\\') {
    c = read_escaped_char(&p, p + 1);
  } else {
    c = *p++;
  }
  // strchr返回字符串中第一个字符的位置，如果没有则返回一个NULL
  char *end = strchr(p, '\'');
  if (!end)
    error_at(p, "unclosed char literal");
  Token *tok = new_token(TK_NUM, start, end + 1);
  tok->val = c;
  return tok;
}

static Token *tokenize(char *filename, char* p) {
  // Character literal
  if (*p == '\'') {
    cur = cur->next = read_char_literal(p);
    p += cur->len;
    continue;
  }
  // code
}
```

## test

```c
// literal.c
#include "test.h"

int main() {
  ASSERT(97, 'a');
  ASSERT(10, '\n');
  ASSERT(-128, '\x80');

  printf("OK\n");
  return 0;
}
```

‍
