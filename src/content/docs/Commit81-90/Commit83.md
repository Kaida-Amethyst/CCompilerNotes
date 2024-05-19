---
title: 83. Modulo Operators
---

## commit log

```plaintext
Add % and %=
```

添加取余操作。

## Lexer

```c
static int read_punct(char *p) {
  static char *kw[] = {
     "==", "!=", "<=", ">=", "->", "+=", "-=", "*=", "/=", "++", "--",
     "%=",
  };
  // code
}
```

## Parser

```c
static Node *mul {
  // other cases
  if (equal(tok, "%")) {
    node = new_binary(ND_MOD, node, cast(&tok, tok->next), start);
    continue;
  }
  *rest = tok;
  return node;
}

static Node *assign(Token **rest, Token *tok) {
  // other cases
  if (equal(tok, "%="))
    return to_assign(new_binary(ND_MOD, node, assign(rest, tok->next), tok));
  *rest = tok;
  return node;
}
```

## type

```c
void add_type(Node *node) {
  // code
  switch(node->kind) {
  // other cases
  case ND_MOD:
    usual_arith_conv(&node->lhs, node->rhs);
    node->ty = node->lhs->ty;
    return ;
  }
}
```

## codegen

```c
static void gen_expr(Node *node) {
  // code
  switch(node->kind) {
  // other cases
  case ND_DIV;
  case ND_MOD:
    if (node->lhs->ty->size == 8)
      println("  cqo");
    else
      println("  cdq");
    println("  idiv %s", di);

    if (node->kind == ND_MOD)
      println("  mov %%rdx, %%rax");
    return ;
  }
}
```

## test

```c
// arith.c
int main() {
  ASSERT(5, 17%6);
  ASSERT(5, ((long)17)%6);
  ASSERT(2, ({ int i=10; i%=4; i; }));
  ASSERT(2, ({ long i=10; i%=4; i; }));
}
```

‍
