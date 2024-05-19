---
title: 38. Hexadecimal Escape
---

## commit log

```plaintext
Add \x<hexadecimal-sequence>
```

除掉八进制以外，C语言还支持以十六进制表示的字符。例如`\x41`代表65，也就是A。

不过与八进制数的识别略有不同的是，`\x`后面是可以识别无限长的字符的，只要这些字符小于`f`，`\x0041`和`\x41`是一样的。

## Lexer

还是修改`read_escaped_char`这个函数。

```c
static int read_escaped_char (char** new_pow, char* p) {
  /* code for octal number */
  if (*p == 'x') {
    p++;
    if (!isxdigit(*p)) 
      error_at(p, "invalid hex escape sequence");

    int c = 0;
    for(; isxdigit(*p); p++)
      c = (c << 4) + from_hex(*p);
    *new_pos = p;
    return c;
  }
  /*  other code  */
}
```

十六进制字符转数字稍微复杂一点，这里我们封装成了一个函数：

```c
static int from_hex(char c) {
  if ('0' <= c && c <= '9')
    return c - '0';
  if ('a' <= c && c <= 'f')
    return c - 'a' + 10;
  return c - 'A' + 10;
}
```

## test.sh

添加以下测例：

```bash
assert 0 'int main() { return "\x00"[0]; }'
assert 119 'int main() { return "\x77"[0]; }'
assert 165 'int main() { return "\xA5"[0]; }'
assert 255 'int main() { return "\x00ff"[0]; }'
```

‍
