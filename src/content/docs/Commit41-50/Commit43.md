---
title: 43. Comments Handling
---

## commit log

```plaintext
Add line and block comments
```

添加注释，比较简单，修改lexer即可。

## Lexer

```c
static Token *tokenize(char* filename, char *p) {
  // ...
   while(*p) {
    if (startswith(p, "//")) {
      p+=2;
      while(*p != '\n')
        p++;
      continue;
    }

    if (startswith(p, "/*")) {
      char *q = strstr(p+2, "*/");
      if (!q) {
        error_at(p, "unclosed block comment");
      }
      p = q+2;
      continue;
    }
  }
}
```

其中出现了`strstr`函数，作用是返回字符串中首次出现的子串的地址。

## test.sh

添加以下测例：

```bash
assert 2 'int main() { /* return 1; */ return 2; }'
assert 2 'int main() { // return 1;
return 2; }'
```

‍
