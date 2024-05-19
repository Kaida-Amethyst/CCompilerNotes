---
title: 85. Logical Operators
---

## commit log

```plaintext
Add && and ||
```

添加逻辑与与逻辑或。

先明晰一个问题，就是`a && b`与`a || b`到底翻译成了什么。x86实际上是没有直接的指令的。实际上逻辑与与逻辑或是通过比较与跳转来实现的。

```x86asm
# a in -4(%rbo)
# b in -8(%rbp)
# c in -12(%rbp)

# c = a && b 
        cmpl    $0, -4(%rbp)
        je      .L2 
        cmpl    $0, -8(%rbp)
        je      .L2 
        movl    $1, %eax
        jmp     .L3 
.L2:
        movl    $0, %eax
.L3:
        movl    %eax, -12(%rbp)

# a || b
        cmpl    $0, -4(%rbp)
        jne     .L2 
        cmpl    $0, -8(%rbp)
        je      .L3 
.L2:
        movl    $1, %eax
        jmp     .L4 
.L3:
        movl    $0, %eax
.L4:
        movl    %eax, -12(%rbp)
```

## Lexer

```c
static int read_punct(char *p) {
  static char *kw[] = {
    "==", "!=", "<=", ">=", "->", "+=", "-=", "*=", "/=", "++", "--",
    "%=", "&=", "|=", "^=", "&&", "||",
  };
  // ...
}
```

## Parser

```c
typedef enum {
  // ...
  ND_LOGAND,
  ND_LOGOR,
} NodeKind;

static Node *logor(Token **rest, Token *tok) {
  Node *node = logand(&tok, tok);
  while(equal(tok, "||")) {
    Token *start = tok;
    node = new_binary(ND_LOGOR, node, logand(&tok, tok->next), start);
  }
  *rest = tok;
  return node;
}

static Node *logand(Token **rest, Token *tok) {
  Node *node = bitor(&tok, tok);
  while (equal(tok, "&&")) {
    Token *start = tok;
    node = new_binary(ND_LOGAND, node, bitor(&tok, tok->next), start);
  }
  *rest = tok;
  return node;
}

static Node *assign(Token **rest, Token *tok) {
  Node *node = logor(&tok, tok);
  // ...
}
```

## type

```c
void add_type(Node *node) {
  // code
  switch(node->kind) {
  case ND_LOGOR:
  case ND_LOGAND:
    node->ty = ty_int;
    return ;
  }
}
```

## codegen

```c
static void gen_expr(Node *node) {
  // code
  switch(node->kind) {
  case ND_LOGAND:
    int c = count();
    gen_expr(node->lhs);
    println("  cmp $0, %%rax");
    println("  je .L.false.%d", c);
    gen_expr(node->rhs);
    println("  cmp $0, %%rax", c);
    println("  je .L.false.%d", c);
    println("  mov $1, %%rax", c);
    println("  jmp .L.end.%d", c);
    println(".L.false.%d:", c);
    println("  mov $0, %%rax");
    println(".L.end.%d:", c);
    return ;
  }
  case ND_LOGOR: {
    int c = count();
    gen_expr(node->lhs);
    println("  cmp $0, %%rax");
    println("  jne .L.true.%d", c);
    gen_expr(node->rhs);
    println("  cmp $0, %%rax");
    println("  jne .L.true.%d", c);
    println("  mov $0, %%rax");
    println("  jmp .L.end.%d", c);
    println(".L.true.%d:", c);
    println("  mov $1, %%rax");
    println(".L.end.%d:", c);
    return ;
  }
}
```

## test

```c
int main() {
  ASSERT(1, 0||1);
  ASSERT(1, 0||(2-2)||5);
  ASSERT(0, 0||0);
  ASSERT(0, 0||(2-2));

  ASSERT(0, 0&&1);
  ASSERT(0, (2-2)&&5);
  ASSERT(1, 1&&5);
}
```
