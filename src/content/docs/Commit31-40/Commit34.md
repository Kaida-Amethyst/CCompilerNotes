---
title: 34. String Literals
---

## commit log

```plaintext
Add string literal
```

字符串对于任何编程语言都是非常重要的元素。本质上是一个char数组。来看一下如何做。

## 思路

首先需要添加lexer支持，让词法分析器可以解析出一个字符串。添加新的Token类型。parser添加新的Node类型。codegen的时候，这里先简单地把所有的字符串都理解为全局变量，在全局变量里注册成一个又一个的byte。

## 头文件

```c
typedef enum {
  /*  other kinds  */
  TK_STR,
  /*  other kinds  */
} TokenKind;

struct Token {
  /*  other fields  */
  Type *ty;     // only used if kind == TK_STR
  char *str;    // string literals
}

struct Obj {
  /*  other fields  */
  // Global variable
  char *init_data;    // 对于带有初值的global variable
  /*  other fields  */
}
```

## Lexer

添加对string的识别。

```c
static Token *read_string_literal(char *start) {
  char* p = start + 1;
  for (; *p != '"'; p++) {
    if (*p == '\n' || *p == '\0')
      error_at(start, "unclosed string literal");
  }

  Token* tok = new_token(TK_STR, start, p + 1);
  tok->ty = array_of(ty_char, p - start);
  tok->str = strndup(start + 1, p - start - 1);
  return tok;
}

Token *tokenize(char* p) {
  /*  other code  */
  if (*p == '"') {
    cur = cur->next = read_string_literal(p);
    p += cur->len;
    continue;
  }
  /*  other code  */
}
```

## Parser

注意我们这里是把所有的字符串字面量都视作一个全局变量的，因此当我们扫描到一个TK_STR的时候，是将其生成一个全局变量的node的。它的名称是一个`.L..{id}`，其中的id是一个数字。

然后string字面量的解析，自然要放在primary里面，自然我们有：

```c
static Node* primary(Token **rest, Token *tok) {
  /*  other code  */
  if (tok->kind == TK_STR) {
    Obj* var = new_string_literal(tok->str, tok->ty);
    *rest = tok->next;
    return new_var_node(var, tok);
  }
  /*  other code  */
}
```

然后我们来实现这个`new_string_literal`。

```c
// used for generate an unique name for every string literals
static char *new_unique_name(void) {
  static int id = 0;
  char* buf = calloc(1, 20);
  sprintf(buf, ".L..%d", id++);
  return buf;
}

static Obj* new_anon_gvar(Type* ty) {
  return new_gvar(new_unique_name(), ty);
}

// used for new a global variable which support string literals
static Obj* new_string_literal(char* p, Type* ty) {
  Obj* var = new_anon_gvar(ty);
  var->init_data = p;
  return var;
}
```

## Codegen

在代码生成的阶段，我们只需要修改有关于全局变量的部分，如果`init_data`不为空的话，生成一系列的byte。

```c
static void emit_data(Obj* prog) {
  /*  other code  */
  if (var->init_data) {
    for (int i = 0; i < var->ty->size; i++)
      printf("  .byte %d\n", var->init_data[i]);
  } else {
    printf("  .zero %d\n", var->ty->size);
  }
  /*  other code  */
}
```

## test.sh

添加以下测例：

```bash
assert 0 'int main() { return ""[0]; }'
assert 1 'int main() { return sizeof(""); }'   # 注意这个测例，其实相当于内置一个\0，因此是1。

assert 97 'int main() { return "abc"[0]; }'
assert 98 'int main() { return "abc"[1]; }'
assert 99 'int main() { return "abc"[2]; }'
assert 0 'int main() { return "abc"[3]; }'
assert 4 'int main() { return sizeof("abc"); }'
```

‍
