---
title: 67. Type Casting
---

## commit log

```plaintext
Add type cast
```

允许类型转换。

## 头文件

```c
typedef enum {
  // other fields
  ND_CAST,
} NodeKind;
```

## Parser

对于语法分析来说，应当把类型转换当成一种操作，那么它应该在unary的前面。

```c
// mul = cast ("*" cast | "/" cast)*
static Node *mul(Token **rest, Token *tok) {
  Node *node = cast(&tok, tok);

  for(;;) {
    Token *start = tok;
    if (equal(tok, "*")) {
      node = new_binary(ND_MUL, node, cast(&tok, tok->next), start);
      continue;
    }

    if (equal(tok, "/")) {
      node = new_binary(ND_DIV, node, cast(&tok, tok->next), start);
      continue;
    }
  }
}
```

这里的第三行原本是调用`unary`，现在替换成了`cast`，现在我们来实现这个`cast`。

注意看下面的推导式：

```c
// cast = "(" typename ")" cast | unary
static Node *cast(Token **rest, Token *tok) {
  if (equal(tok, "(") && is_typename(tok->next)) {
    Token *start = tok;
    Type *ty = typename(&tok, tok->next);
    tok = skip(tok, ")");
    Node *node = new_cast(cast(rest, tok, ty));
    node->tok = start;
    return node;
  }
  return unary(rest, tok);
}
```

这里面我们调用了`new_cast`来生成一个`cast`的语法Node，然后我们来实现它。

```c
static Node *new_cast(Node *expr, Type *ty) {
  add_type(expr);
  Node *node = calloc(1, sizeof(Node));
  node->kind = ND_CAST;
  node->tok = expr->tok;
  node->lhs = copy_type(ty);
  return node;
}
```

除此之外我们还需要修改`unary`的定义，因为`unary`完全可以对一个cast进行操作，最典型的就是：`*(float*)&x`。

```c
// unary = ("+" | "-" | "*" | "&") cast
//       | postfix
static Node *unary(Token **rest, Token *tok) {
  if (equal(tok, "+"))
    return cast(rest, tok->next);

  if (equal(tok, "-"))
    return new_unary(ND_NEG, cast(rest, tok->next), tok);

  if (equal(tok, "&"))
    return new_unary(ND_ADDR, cast(rest, tok->next), tok);

  if (equal(tok, "*"))
    return new_unary(ND_DEREF, cast(rest, tok->next), tok);

  return postfix(rest, tok);
}
```

## Codegen

我们这里实际上只支持部分cast的特性，暂时还不能任意转换。实际上只能从32位转成16位，8位和64位。

```c
enum {I8, I16, I32, I64};

static int getTypeId(TYpe *ty) {
  switch(ty->kind) {
  case TY_CHAR:
    return I8;
  case TY_SHORT:
    return I16;
  case TY_INT:
    return I32;
  }
  return I64;
}

// The table for type casts
static char i32i8[] = "movsbl %al, %eax";
static char i32i16[] = "movswl %ax, %eax";
static char i32i64[] = "movsxd %eax, %rax";

static char *cast_table[][10] = {
  {NULL,  NULL,   NULL, i32i64},
  {i32i8, NULL,   NULL, i32i64},
  {i32i8, i32i16, NULL, i32i64},
  {i32i8, i32i16, NULL, NULL},
};

static void cast(Type *from, Type* to) {
  if (to->kind == TY_VOID)
    return ;

  int t1 = getTypeId(from);
  int t2 = getTypeId(to);
  if (cast_table[t1][t2])
    println("  %s", cast_table[t1][t2]);
}

static void gen_expr(Node *node) {
  // code
  switch(node->kind) {
  // other cases
  case ND_CAST:
    gen_expr(node->lhs);
    cast(node->lhs->ty, node->ty);
    return ;
  }
}
```

## 测例

```c
#include "test.h"

int main() {
  ASSERT(131585, (int)8590066177);
  ASSERT(513, (short)8590066177);
  ASSERT(1, (char)8590066177);
  ASSERT(1, (long)1);
  ASSERT(0, (long)&*(int *)0);
  ASSERT(513, ({ int x=512; *(char *)&x=1; x; }));
  ASSERT(5, ({ int x=5; long y=(long)&x; *(int*)y; }));

  (void)1;

  printf("OK\n");
  return 0;
}
```
