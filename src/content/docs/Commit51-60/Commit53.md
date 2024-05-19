---
title: 53. Pointer Access
---

## commit log

```plaintext
Add -> operator
```

对于struct成员的访问，除掉`.`操作符外，自然还有就是`->`操作符了。直接在词法分析和语法分析中进行修改就好。

## Lexer

添加新的操作符，这里我们修改一下`read_punct`函数：

```c
static int read_punct(char *p) {
  static char *kw[] = {"==", "!=", "<=", ">=", "->"};

  for(int i = 0; i < sizeof(kw) / sizeof(*kw); i++) {
    if (startswith(p, kw[i]))
      return strlen(kw[i]);
  }
  return ispunct(*p) ? 1 : 0;
}
```

## Parser

主要修改`posifix`函数

```c
static Node *postfix(Token **rest, Token *tok) {
  // othe code
  if (equal(tok, "->")) {
    node = new_unary(ND_DEREF, node, tok);
    node = struct_ref(node, tok->next);
    tok = tok->next->next;
    continue;
  }
  // other codes
}
```

## tesh.sh

最后添加测例即可：

```c
// struct.c
ASSERT(3, ({ struct t {char a;} x; struct t *y = &x; x.a=3; y->a; }));
ASSERT(3, ({ struct t {char a;} x; struct t *y = &x; y->a=3; x.a; }));
```

‍
