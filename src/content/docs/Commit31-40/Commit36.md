---
title: 36. Escape Sequences
---

## commit log

```plaintext
Add \a, \b, \t, \n \v, \f, \r and \e
```

添加对特殊字符的识别，只需要在识别string的时候，当扫描到`\`的时候进行一下判断即可。

## Lexer

主要是要修改对string的识别。额外注意一下的是，我们在未来还可能支持`\"`这样的字符，因此在这里我们就把这些问题考虑到。

```c
static Token *read_string_literal(char* start) {
  char* end = string_literal_end(start+1);
  char* buf = calloc(1, end - start);
  int len = 0;

  for(char* p = start + 1; p < end; ) {
    if (*p == '\\') {
      buf[len++] = read_escaped_char(p+1);
      p+=2;
    } else {
      buf[len++] = *p++;
    }
  }
  Token* tok = new_token(TK_STR, start, end + 1);
  tok->ty = array_of(ty_char, len+1);   // len+1是因为末尾有\0
  tok->str = buf;
  return tok;
}
```

上面的代码比较好懂，就不多解释了，接下来我们来实现`string_literal_end`和`read_escaped_char`。

```c
static char* string_literal_end(char* p) {
  char* start = p;
  for (; *p != '"'; p++) {
    if (*p == '\n' || *p == '\0')
      error_at(start, "unclosed string literal");
     if (*p == '\\')
       p++;
  }
  return p;
}

static int read_escaped_char(char* p) {
  switch(*p) {
  case 'a': return '\a';
  case 'b': return '\b';
  case 't': return '\t';
  case 'n': return '\n';
  case 'v': return '\v';
  case 'f': return '\f';
  case 'r': return '\e';
  case 'e': return '\e';
  default:  return *p;
  }
}
```

## test.sh

添加以下测例：

```bash
assert 7 'int main() { return "\a"[0]; }'
assert 8 'int main() { return "\b"[0]; }'
assert 9 'int main() { return "\t"[0]; }'
assert 10 'int main() { return "\n"[0]; }'
assert 11 'int main() { return "\v"[0]; }'
assert 12 'int main() { return "\f"[0]; }'
assert 13 'int main() { return "\r"[0]; }'
assert 27 'int main() { return "\e"[0]; }'

assert 106 'int main() { return "\j"[0]; }'
assert 107 'int main() { return "\k"[0]; }'
assert 108 'int main() { return "\l"[0]; }'

assert 7 'int main() { return "\ax\ny"[0]; }'
assert 120 'int main() { return "\ax\ny"[1]; }'
assert 10 'int main() { return "\ax\ny"[2]; }'
assert 121 'int main() { return "\ax\ny"[3]; }'
```

‍
