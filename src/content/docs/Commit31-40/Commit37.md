---
title: 37. Octal Escape Sequences
---

## commit log

```plaintext
Add \<octal-sequence>
```

这里是一个C语言中比较少见的技巧，就是字符串中一个`\`如果后面跟了三个以内小于8的字符，代表的是一个8进制数，例如`\101`代表的是65，当然`\0`的值本身是0，但它同时也可以理解为一个八进制数。但是要注意的是，`\`最多只能是3个8以内的字符，像`\101`这种实际上是解释为一个字符的，值是65。

## Lexer

直接修改词法分析中的`read_escaped_char`即可。

```c
static int read_escaped_char(char **new_pos, char *p) {
  if ('0' <= *p && *p <= '7') { // 解析第一个8以内的字符
    int c = *p++ - '0';
    if ('0' <= *p && *p <= '7') {
      c = (c<<3) + (*p++ - '0');
      if ('0' <= *p && *p <= '7') 
        c = (c<<3) + (*p++ - '0');
    }
    *new_pos = p;
    return c;
  }

  *new_pos = p+1;
  /*  other code  */
}
```

当然我们这里修改了`read_escaped_char`的定义，自然也要修改使用到这个函数的地方。

```c
static Token *read_string_literal(char* start) {
  /*  other code  */
  for(char* p = start + 1; p < end; ) {
    if (*p == '\\') 
      buf[len++] = read_escaped_char(&p, p+1);
    else
      buf[len++] = *p++;
  }
  /*  other code  */
}
```

## test.sh

添加以下测例：

```bash
assert 0 'int main() { return "\0"[0]; }'
assert 16 'int main() { return "\20"[0]; }'
assert 65 'int main() { return "\101"[0]; }'
assert 104 'int main() { return "\1500"[0]; }'
```

‍
