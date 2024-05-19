---
title: 77. Assignment Operators
---

## commit log

```plaintext
Add +=, -=, *= and /=
```

添加`+=`，`-=`，`*=`以及`/=`符号。

## Lexer

添加对四种符号的支持。

```c
static int read_punct(char *p) {
  static char *kw[] = {
    "==", "!=", "<=", ">=", "->", "+=", "-=", "*=", "/=",
  };
  // code
}
```

## Parser

修改有关语法分析中`assign`的部分即可。

先来实现一个`to_assign`函数。

（疑问：为什么不将`A op= B`直接改写成`A = A op B`？）

```c
// Convert A op= B to tmp = &A, *tmp = *tmp op B
// where tmp is a fresh pointer variable
static Node *to_assign(Node *binary) {
  add_type(binary->lhs);
  add_type(binary->rhs);
  Token *tok = binary->tok;
  Obj *var = new_lvar("", pointer_to(binary->lhs->ty));
  Node *expr1 = new_binary(ND_ASSIGN, new_var_node(var, tok), new_unary(ND_ADDR, binary->lhs, tok), tok);
  Node *expr2 = new_binary(ND_ASSIGN,
                           new_unary(ND_DEREF, new_var_node(var, tok), tok),
                           new_binary(binary->kind,
                                      new_unary(ND_DEREF, new_var_node(var, tok), tok), 
                                      binary_rhs,
                                      tok),
                           tok);
  return new_binary(ND_COMMA, expr1, expr2, tok)l
}
```

然后在`assign`函数中利用上面的`to_assign`。

```c
static Node *assign(Token **rest, Token *tok) {
  Node * node = equality (&tok, tok);
  if (equal(tok, "=")) 
    return new_binary(ND_ASSIGN, node, assign(rest, tok->next), tok);
  if (equal(tok, "+="))
    return to_assign(new_add(node, assign(rest, tok->next), tok));
  if (equal(tok, "-="))
    return to_assign(new_sub(node, assign(rest, tok->next), tok));
  if (equal(tok, "*="))
    return to_assign(new_binary(ND_MUL, node, assign(rest, tok->next), tok));
  if (equal(tok, "/="))
    return to_assign(new_binary(ND_DIV, node, assign(rest, tok->next), tok));

  *rest = tok;
  return node;
}
```

## test

```c
// arith.c
int main() {
  ASSERT(7, ({ int i=2; i+=5; i; }));
  ASSERT(7, ({ int i=2; i+=5; }));
  ASSERT(3, ({ int i=5; i-=2; i; }));
  ASSERT(3, ({ int i=5; i-=2; }));
  ASSERT(6, ({ int i=3; i*=2; i; }));
  ASSERT(6, ({ int i=3; i*=2; }));
  ASSERT(3, ({ int i=6; i/=2; i; }));
  ASSERT(3, ({ int i=6; i/=2; }));
}
```

‍
