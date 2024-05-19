---
title: 82. Bitwise NOT
---

## commit log

```plaintext
Add ~ operator
```

添加`~`操作符。

基本思路与前一次commit一致。

## Parser

```c
typedef enum {
  //...
  ND_BITNOT,
} NodeKind ;

static Node *unary(Token **rest, Token *tok) {
  // other cases
  if (equal(tok, "~"))
    return new_unary(ND_BITNOT, cast(rest, tok->next), tok);
}
```

## type

```c
void add_type(Node *node) {
  // code
  switch(node->kind) {
  case ND_BITNOT:
    node->ty = node->lhs->ty;
    return;
  // other cases
  }
}
```

## codegen

```c
static void gen_expr(Node * node) {
  println(/*...*/);
  switch(node->kind) {
  case ND_BITNOT:
    gen_expr(node->lhs);
    println("  not %%rax");
    return ;
  // other cases
  }
  // code
}

```

## test

```c
// arith.c
int main() {
  ASSERT(-1, ~0);
  ASSERT(0, ~-1);
}
```
