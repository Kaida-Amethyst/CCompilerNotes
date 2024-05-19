---
title: 94. Ternary Operator
---

## commit log

```plaintext
Add ?: operator
```

添加`?:`三目运算符。

## Parser

```c
// chibicc.h
typedef enum {
  // other fields
  ND_COND,
}NodeKind;

// parser.c
static Node *assign(Token **rest, Token *tok) {
  Node *node = conditional(&tok, tok);
  // ...
}

static Node *conditional(&tok, tok) {
  Node *cond = logor(&tok, tok);
  if (!equal(tok, "?")) {
    *rest = tok;
    return cond;
  }

  Node *node = new_node(ND_COND, tok);
  node->cond = cond;
  node->then = expr(&tok, tok->next);
  tok = skip(tok, ":");
  node->els = conditional(rest, tok);
  return node;
}
```

## type

```c
void add_type(Node *node) {
  // code
  switch(node->kind) {
  // other cases
  case ND_COND:
    if (node->then->ty->kind == TY_VOID || node->els->ty->kind == TY_VOID) {
      node->ty = ty_void;
    } else {
      usual_arith_conv(&node->then, &node->els);
      node->ty = node->then->ty;
    }
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
  case ND_COND: {
    int c = count();
    gen_expr(node->cond);
    println("  cmp $0, %%rax");
    println("  je .L.else.%d", c);
    gen_expr(node->then);
    println("  jmp .L.end.%d", c);
    println(".L.else.%d:", c);
    gen_expr(node->els);
    println(".L.end.%d:", c);
    return;
  }
  }
}
```

## test

```c
// arith.c
int main() {
  ASSERT(2, 0?1:2);
  ASSERT(1, 1?1:2);
  ASSERT(-1, 0?-2:-1);
  ASSERT(-2, 1?-2:-1);
  ASSERT(4, sizeof(0?1:2));
  ASSERT(8, sizeof(0?(long)1:(long)2));
  ASSERT(-1, 0?(long)-2:-1);
  ASSERT(-1, 0?-2:(long)-1);
  ASSERT(-2, 1?(long)-2:-1);
  ASSERT(-2, 1?-2:(long)-1);
  1 ? -2 : (void)-1;
}
```
