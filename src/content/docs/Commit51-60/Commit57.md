---
title: 57. Long Type
---

## commit log

```plaintext
Add long type
```

添加long类型。

## 头文件

```c
#include <stdint.h>

struct Token {
  // other fields
  int64_t val;  // used is kind == ND_NUM
  // other fields
};

struct Node {
  // other fields
  int64_t val;  // used is kind == ND_NUM
};
```

注意上面原先的`val`的类型是`int`，这里修改成了`int64_t`。就是为了兼用long型。

```c
typedef enum {
  // other TypeKind
  TY_LONG,
} TypeKind;

extern Type *ty_long;
```

## Lexer

添加新的关键字，这里我们把`short`也给加上，为下一次commit做准备。

```c
static bool is_keyword(Token *tok) {
  static char *kw[] = {
    "return", "if", "else", "for", "while", "int", "sizeof", "char",
    "struct", "union", "long", "short",
  };
  // other code
}
```

## Type.c

```c
Type *ty_long = &(Type){TY_LONG, 8, 8};

bool is_integer(Type *ty) {
  TypeKind k = ty->kind;
  return k == TY_CHAR || k == TY_INT || k == TY_LONG;
}

void add_type(Node *node) {
  /*  other code  */
  switch (node->kind) {
    /* other cases  */
    case ND_EQ:
    case ND_NE:
    case ND_LT:
    case LE:
    case ND_NUM:
    case ND_FUNCALL:
      node->ty = ty_long;
      return;
    /*  other cases  */
  }
}
```

因为我们先前在头文件中修改了`Token`段，现在我们需要对应地修改`new_num`，然后需要在`declspec`函数中添加对`long`型的支持。

```c
static Node *new_num(int64_t val, Token *tok) {
  // keep the original code
}

static Type *declspec(Token **rest, Token *tok) {
  // code
  if (equal(tok, "long")) {
    *rest = tok->next;
    return ty_long;
  }
  // code
}

static bool is_typename(Token *tok) {
  return equal(tok, "char") || equal(tok, "short") || equal(tok, "int") ||
         equal(tok, "long") || equal(tok, "struct")|| equal(tok, "union");
}
```

## codegen

在`gen_expr`中添加：

```c
static void gen_expr(Node *node) {
  // codes
  switch(node->kind) {
    case ND_NUM:
      println("  mov $%ld, %%rax", node->val);
      return ;
    // other cases
  }
}
```

从这里就可以看出，寄存器其实是不怎么区分一个数的类型的，一个数的类型主要关系到存储。

## test.sh

```c
// function.c
int sub_long(long a, long b, long c) {
  return a - b - c;
}

int main() {
  ASSERT(1, sub_long(7, 3, 3));
  return 0;
}

// struct.c
int main() {
  ASSERT(16, ({ struct {char a; long b;} x; sizeof(x); }));
  return 0;
}

// variable.c
int main() {
  ASSERT(8, ({ long x; sizeof(x); }));
}
```
