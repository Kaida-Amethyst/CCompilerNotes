---
title: 80. Numeral Literals
---

## commit log

```plaintext
Add hexadecimal, octal and binary number literals
```

添加对二进制，八进制，十六进制数的支持。

## Lexer

修改词法分析即可：

```c
static Token *read_int_literal(char *start) {
  char *p = start;

  int base = 10;
  if (!strncasecmp(p, "0x", 2) && isalnum(p[2])) {
    p += 2;
    base = 16;
  } else if (!strncasecmp(p, "0b", 2) && isalnum(p[2])) {
    p += 2;
    base = 2;
  } else if (*p == '0') {
    base = 8;
  }

  long val = strtoul(p, &p, base);
  if (isalnum(*p))
    error_at(p, "invalid digit");

  Token *tok = new_token(TK_NUM, start, p);
  tok->val = val;
  return tok;
}

static Token *tokenize(char *filename, char *p) {
  // code
  if (isdigit(*p)) {
    cur = cur->next = read_int_literal(p);
    p += cur->len;
  }
}
```

## test

```c
// literal.c
int main() {
  ASSERT(511, 0777);
  ASSERT(0, 0x0);
  ASSERT(10, 0xa);
  ASSERT(10, 0XA);
  ASSERT(48879, 0xbeef);
  ASSERT(48879, 0xBEEF);
  ASSERT(48879, 0XBEEF);
  ASSERT(0, 0b0);
  ASSERT(1, 0b1);
  ASSERT(47, 0b101111);
  ASSERT(47, 0B101111);
} 
```
