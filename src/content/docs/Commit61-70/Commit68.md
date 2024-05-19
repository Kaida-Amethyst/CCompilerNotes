---
title: 68. Arithmetic Conversion
---

## commit log

```plaintext
Implement usual arithmetic conversion
```

思考这样的问题，两个不同类型的数相加，结果应当是何种类型？

对于基本类型而言，不同类型相加，取位宽较大的那个类型，例如`int+long=long`，`short+int=int`这样。

这样一来就涉及到在类型分析中进行cast了。我们来将其实现。

另外，我们在代码中的数一般都是64位，现在我们要进一步区分。

## 头文件

把`new_cast`这个函数修改成非`static`的函数。

```c
Node *new_cast(Node *expr, Type* ty);
```

## Parser

语法分析的部分，要开始区分数了。

```c
static Node new_long(int64_t val, Token *tok) {
  Node *node = new_node(ND_NUM, tok);
  node->val = val;
  node->ty = ty_long;
  return node;
}

static Node *new_add(Node *lhs, Node *rhs, Token *tok) {
  // code
  // ptr+num
  rhs = hew_binary(ND_MUL, rhs, new_long(lhs->ty->base->size, tok), tok);
  return new_binary(ND_ADD, lhs, rhs, tok);
}

static Node *new_sub(Node *lhs, Node *rhs, Token *tok) {
  // code
  // ptr - num
  if (lhs->ty->base && is_integer(rhs->ty)) {
    rhs = new_binary(ND_MUL, rhs, new_long(lhs->ty->base->size, tok), tok);
    // code
  }
}
```

## type

重点是对type的分析。

我们先来实现一个两个操作数类型转换的函数。当两个操作数类型不一致时，将其进行转换。（不过在这里，我们是无论两个操作数是否一致都进行转换）

```c
static void usual_arith_conv(Node **lhs, Node **rhs) {
  Type *ty = get_common_type((*lhs)->ty, (*rhs)->ty);
  *lhs = new_cast(*lhs, ty);
  *rhs = new_cast(*rhs, ty);
}
```

这里我们使用了`get_common_type`，我们来将其实现：

```c
static Type *get_commin_type(Type *ty1, Type *ty2) {
  if (ty1->base)
    return pointer_to(ty1->base);
  if (ty1->size == 8 || ty2->size == 8)
    return ty_long
  return ty_int;
}
```

注意上面的代码表明，如果是`short+char`或者`short+short`这种组合，实际上也是按照`int+int`这种来处理的。

```c
void add_type(Node *node) {
  // code
  switch(node->kind) {
  case ND_NUM:
    node->ty = (node->val == (int)node->val) ? ty_int : ty_long;
    return ;
  case ND_ADD:
  case ND_SUB:
  case ND_MUL:
  case ND_DIV:
    usual_arith_conv(&node->lhs, &node->rhs);
    node->ty = node->lhs->ty;
    return ;
  case ND_NEG: {
    Type *ty = get_common_type(ty_int, node->lhs->ty);
    node->lhs = new_cast(node->lhs, ty);
    node->ty = ty;
    return ;
  }
  case ND_ASSIGN:
    if (node->lhs->ty->kind == TY_ARRAY)
      error_tok(node->lhs->tok, "not an lvalue");
    if (node->lhs->ty->kind != TY_STRUCT)
      node->rhs = new_cast(node->rhs, node->lhs->ty);
    node->ty = node->lhs->ty;
    return;
  case ND_EQ:
  case ND_NE:
  case ND_LT:
  case ND_LE:
    usual_arith_conv(&node->lhs, &node->rhs);
    node->ty = ty_int;
    return ;
  // other cases 
  }
}

```

## Codegen

修改一下`load`函数，主要是把类型大小小于8的基本类型使用`%eax`，而不是`%rax`。

```c
static void load(Type *ty) {
  // code
  if (ty->size == 1)
    println("  movsbl (%%rax), %%eax");
  else if (ty->size == 2)
    println("  movswl (%%rax), %%eax");
  else if (ty->size == 4)
    println("  movsxd (%%rax), %%rax");
  else
    // code
}
```

## 测例

最后添加测例：

```c
// sizeof.c
  ASSERT(8, sizeof(-10 + (long)5));
  ASSERT(8, sizeof(-10 - (long)5));
  ASSERT(8, sizeof(-10 * (long)5));
  ASSERT(8, sizeof(-10 / (long)5));
  ASSERT(8, sizeof((long)-10 + 5));
  ASSERT(8, sizeof((long)-10 - 5));
  ASSERT(8, sizeof((long)-10 * 5));
  ASSERT(8, sizeof((long)-10 / 5));

// usualconv.c
#include "test.h"

int main() {
  ASSERT((long)-5, -10 + (long)5);
  ASSERT((long)-15, -10 - (long)5);
  ASSERT((long)-50, -10 * (long)5);
  ASSERT((long)-2, -10 / (long)5);

  ASSERT(1, -2 < (long)-1);
  ASSERT(1, -2 <= (long)-1);
  ASSERT(0, -2 > (long)-1);
  ASSERT(0, -2 >= (long)-1);

  ASSERT(1, (long)-2 < -1);
  ASSERT(1, (long)-2 <= -1);
  ASSERT(0, (long)-2 > -1);
  ASSERT(0, (long)-2 >= -1);

  ASSERT(0, 2147483647 + 2147483647 + 2);
  ASSERT((long)-1, ({ long x; x=-1; x; }));

  ASSERT(1, ({ char x[3]; x[0]=0; x[1]=1; x[2]=2; char *y=x+1; y[0]; }));
  ASSERT(0, ({ char x[3]; x[0]=0; x[1]=1; x[2]=2; char *y=x+1; y[-1]; }));
  ASSERT(5, ({ struct t {char a;} x, y; x.a=5; y=x; y.a; }));

  printf("OK\n");
  return 0;
}
```

‍
