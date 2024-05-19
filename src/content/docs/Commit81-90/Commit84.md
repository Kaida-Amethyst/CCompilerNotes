---
title: 84. Bitwise Operators
---

## commit log

```plaintext
Add &, |, ^, &=, |= and ^=
```

添加按位与或异或运算。这里要注意一下优先级问题，三种按位运算不是同一优先级的。

## Lexer

```c
static int read_punct(char *p) {
  static char *kw[] = {
    "==", "!=", "<=", ">=", "->", "+=", "-=", "*=", "/=", "++", "--",
    "%=", "&=", "|=", "^=",
  };
  // ...
}
```

## Parser

稍微注意一下位运算的优先级问题：优先级是`&>^>|`，也就是说要先算按位与，再算按位异或，再算按位或。

```c
typedef enum {
  // other fields
  ND_BITAND.
  ND_BITOR,
  ND_BITXOR,
} NodeKind;

static Node *bitor (Token **rest, Token *tok) {
  Node *node = bitxor(&tok, tok);
  while(equal(tok, "|")) {
    Token *start = tok;
     node = new_binary(ND_BITOR, node, bitxor(&tok, tok->next), start);
  }
  *rest = tok;
  return node;
}

static Node *bitxor (Token **rest, Token *tok) {
  Node *node = bitand(&tok, tok);
  while (equal(tok, "^")) {
    Token *start = tok;
    node = new_binary(ND_BITXOR, node, bitand(&tok, tok->next, start));
  }
  *rest = tok;
  return node;
}

static Node *bitand(Token **rest, Token *tok) {
  Node *node = equality(&tok, tok);
  while (equal(tok, "&")) {
    Token *start = tok;
    node = new_binary(ND_BITAND, node, equality(&tok, tok->next), start);
  }
  *rest = tok;
  return node;
}

static Node *assign(Token **rest, Token *tok) {
  Node *node = bitor(&tok, tok);
  if (equal(tok, "="))
    // ...
  if (equal(tok, "%="))
    // ...
  if (equal(tok, "&="))
    return to_assign(new_binary(ND_BITAND, node, assign(rest, tok->next), tok));
  if (equal(tok, "!="))
    return to_assign(new_binary(ND_BITOR, node, assign(rest, tok->next), tok));
  if (equal(tok, "^="))
    return to_assign(new_binary(ND_BITXOR, node, assign(rest, tok->next), tok));
  *rest = tok;
  return node;
}
```

## type

```c
void add_type(Node *node) {
  // code
  switch(node->kind) {
  case ND_BITAND:
  case ND_BITOR:
  case ND_BITXOR:
    usual_arith_conv(&node->lhs, &node->rhs);
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
  case ND_BITAND:
    println("  and %%rdi, %%rax");
    return ;
  case ND_BITOR:
    println("  or %%rdi, %%rax");
    return ;
  case ND_BITXOR:
    println("  xor %%rdi, %%rax");
    return ;
  }
}
```

## test

```c
// arith.c
int main() {
  ASSERT(0, 0&1);
  ASSERT(1, 3&1);
  ASSERT(3, 7&3);
  ASSERT(10, -1&10);

  ASSERT(1, 0|1);
  ASSERT(0b10011, 0b10000|0b00011);

  ASSERT(0, 0^0);
  ASSERT(0, 0b1111^0b1111);
  ASSERT(0b110100, 0b111000^0b001100);

  ASSERT(2, ({ int i=6; i&=3; i; }));
  ASSERT(7, ({ int i=6; i|=3; i; }));
  ASSERT(10, ({ int i=15; i^=5; i; }));
}
```
