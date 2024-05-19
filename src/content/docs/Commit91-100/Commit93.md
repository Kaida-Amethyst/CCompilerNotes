---
title: 93. Shift Operators
---

## commit log

```plaintext
Add <<, >>, <<= and >>=
```

添加左移，右移位运算。

## Lexer

```c
static int read_punct(char *p) {
  static char *kw[] = {
    "<<=", ">>=", "==", "!=", "<=", ">=", "->", "+=",
    "-=", "*=", "/=", "++", "--", "%=", "&=", "|=", "^=", "&&",
    "||", "<<", ">>",
  };
}
```

## Parser

```c
// chibicc.h
typedef enum {
  // other fields
  ND_SHL,   // <<
  ND_SHR,   // >>
} NodeKind;

// parser.c
static Node *relational (Token **rest, Token *tok) {
  Node *node = shift(&tok, tok);

  for(;;) {
    Token *start = tok;
    if (equal(tok, "<")) {
      node = new_binary(ND_LT, node, shift(&tok, tok->next), satrt);
      continue;
    }
    if (equal(tok, "<=")) {
      node = new_binary(ND_LE, node, shift(&tok, tok->next), satrt);
      continue;
    }
    if (equal(tok, ">")) {
      node = new_binary(ND_GT, node, shift(&tok, tok->next), satrt);
      continue;
    }
    if (equal(tok, ">=")) {
      node = new_binary(ND_GE, node, shift(&tok, tok->next), satrt);
      continue;
    }
    *rest = tok;
    return node;
  }
}

static Node *shift(Token **rest, Token *tok) {
  Node *node = add(&tok, tok);
  for(;;) {
    Token *start = tok;
    if (equal(tok, "<<")) {
      node = new_binary(ND_SHL, node, add(&tok, tok->next), start);
      continue;
    }
    if (equal(tok, ">>")) {
      node = new_binary(ND_SHR, node, add(&tok, tok->next), start);
      continue;
    }
    *rest = tok;
    return node;
  }
}

static Node *assign(Token **rest, Token *tok) {
  // other cases
  if (equal(tok, "<<="))
    return to_assign(new_binary(ND_SHL, node, assign(rest, tok->next), tok));

  if (equal(tok, ">>="))
    return to_assign(new_binary(ND_SHR, node, assign(rest, tok->next), tok));
}
```

## type

```c
void add_type(Node *node) {
  switch(node->kind) {
  // other cases
  case ND_SHL:
  case ND_SHR:
    node->ty = node->lhs->ty;
    return;
  }
}
```

## codegen

```c
static void gen_expr(Node *node) {
  // code
  switch(node->kind) {
  // other cases
  case ND_SHL:
    println("  mov %%rdi, %%rcx");
    println("  shl %%cl, %s", ax);
    return ;
  case ND_SHR:
    println("  mov %%rdi, %%rcx");
    if (node->ty->size == 8)
      println("  sar %%cl, %s", ax);
    else
      println("  sar %%cl, %s", ax);
    return ;
  }
}
```

## test

```c
// arith.c
int main() {
  ASSERT(1, 1<<0);
  ASSERT(8, 1<<3);
  ASSERT(10, 5<<1);
  ASSERT(2, 5>>1);
  ASSERT(-1, -1>>1);
  ASSERT(1, ({ int i=1; i<<=0; i; }));
  ASSERT(8, ({ int i=1; i<<=3; i; }));
  ASSERT(10, ({ int i=5; i<<=1; i; }));
  ASSERT(2, ({ int i=5; i>>=1; i; }));
  ASSERT(-1, -1);
  ASSERT(-1, ({ int i=-1; i; }));
  ASSERT(-1, ({ int i=-1; i>>=1; i; }));
}
```

‍
