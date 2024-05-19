---
title: 49. Structs
---

## commit log

```plaintext
Add struct
```

来添加struct，其实有了面向对象的影子了。

结构体的添加要考虑两个部分，一个是作为外在整体的struct，另一个是内在的member。

它的实现比较类似于数组，举例来说：

```c
struct S {
  int x;
  double y;
};

S a;
```

首先a有一个基址，然后对于`a.x`来说，它的offset是0，要获取`a.x`就是先把这个基址加上0，然后再取四个字节。对于`a.y`来说，offset是4，就将其基址加上4，再取8个字节。

稍微注意一下，我们这里实现的struct，暂时还不能声明成一个特定的类型。

## 头文件

我们首先来添加Member，代表的是struct的内在结构：

```c
typedef struct Member Member;

typedef enum {
  // other Kinds
  ND_MEMBER,    // .注意这个是获取Member的意思，用.来获取
} NodeKind;

struct Member {
  Member *next;
  Type  *ty;
  Token *name;
  int offset;
};

struct Node {
  // other fields
  Member *member;
};

typedef enum {
  // other kinds
  TY_STRUCT,
};

struct Type {
  // other fields
  // struct
  Member *members;
};
```

## Lexer

添加一个关键字：

```c
static bool is_keyword(Token *tok) {
  static char *kw[] = {
    "return", "if", "else", "for", "while", "int", "sizeof", "char",
    "struct",
  };

  for (int i = 0; i < sizeof(kw) / sizeof(*kw); i++)
    if (equal(tok, kw[i]))
      return true;
  return false;
}
```

## Parser

添加对struct的声明与定义的语法分析：

```c
static Type* struct_decl(Token** rest, Token *tok);

static Type *declspec(Token **rest, Token *tok) {
  if (equal(tok, "char")) {
    *rest = tok->next;
    return ty_char;
  }

  if (equal(tok, "int")) {
    *rest = tok->next;
    return ty_int;
  }

  if (equal(tok, "struct")) {
    return struct_decl(rest, tok->next);
  }

  error_tok(tok, "typename expected");
}

static bool is_typename(Token *tok) {
  return equal(tok, "char") || equal(tok, "int") || equal(tok, "struct");
}

// 此时tok指向'{'后面的token，用被后面的struct_decl调用
static void struct_members(Token **rest, Token *tok, Type *ty) {
  Member head = {};
  Member *cur = &head;

  while(!equal(tok, "}")) {
    Type *basety = declspec(&tok, tok);
    int i = 0;
    while(!consume(&tok, tok, ";")) {
      if (i++)
        tok = skip(tok, ",");

      Member *mem = calloc(1, sizeof(Member));
      mem->ty = declarator(&tok, tok, basety);
      mem->name = mem->ty->name;
      cur = cur->next = mem;
    }
  }
  *rest = tok->next;
  ty->members = head.next;
}

// struct的定义
static Type* struct_decl(Token **rest, Token *tok) {
  tok = skip(tok, "{");

  Type *ty = calloc(1, sizeof(Type));
  ty->kind = TY_STRUCT;
  struct_members(rest, tok, ty);

  // Assign offsets within the struct to members
  int offset = 0;
  for(Member *mem = ty->members; mem; mem = mem->next) {
    mem->offset = offset;
    offset += mem->ty->size;
  }
  ty->size = offset;

  return ty;
}

// 获取成员变量
static Member *get_struct_member(Type* ty, Token *tok) {
  for(Member *mem = ty->members; mem; mem = mem->next) 
    if (mem->name->len == tok->len &&
        !strncmp(mem->name->loc, tok->loc, tok->len))
      return mem;
  error_tok(tok, "no such member");
}
```

添加好对struct的声明和定义后，接下的问题就是怎么去获取成员变量了，最常规的方法就是使用`.`运算符：

```c
static Node* postfix(Token **rest, Token *tok) {
  Node* node = primary(&tok, tok);

  for(;;) {
    // 下面是原先就有的
    if (equal(tok, "[")) {
      Token *start = tok;
      Node *idx = expr(&tok tok->next);
      tok = skip(tok, "]");
      node = new_unary(ND_DEREF, new_add(node, idx, start), start);
      continue;
    }

    if (equal(tok, ".")) {
      node = struct_ref(node, tok->next);
      tok = tok->next->next;
      continue;
    }

    *rest = tok;
    return node;
  }
}
```

这里面我们调用了`struct_ref`函数，现在我们来实现一下：

```c
static Node *struct_ref(Node* lhs, Token *tok) {
  add_type(lhs);
  if (lhs->ty->kind != TY_STRUCT) 
    error_tok(lhs->tok, "not a struct");
  Node *node = new_unary(ND_MEMBER, lhs, tok);
  node->member = get_struct_member(lhs->ty, tok);
  return node;
}
```

## type

在`type.c`中添加：

```c
void add_type(Node *node) {
  /*  other code  */
  switch (node->kind) {
  /*  other cases  */
  case ND_MEMBER:
    node->ty = node->rhs->ty;
    return;
  /*  other cases  */
  }
}
```

## codegen

然后是代码生成部分：

```c
static void gen_addr(Node *node) {
  /*  other code  */
  switch(node->kind) {
  /*  other cases  */
  case ND_MEMBER:
    gen_addr(node->lhs);
    println("  add $%d, %%rax", node->member->offset);
    return ;
  /*  other cases  */
  }
}

static void gen_expr(Node *node) {
  /* other code  */
  switch(node->kind) {
  /*  other cases  */
  case ND_MEMBER:
    gen_addr(node);
    load(node->ty);
    return ;
  /*  other cases  */
  }
}
```

## test.sh

最后， 添加一些测例：

```c
#include "test.h"

int main() {
  ASSERT(1, ({ struct {int a; int b;} x; x.a=1; x.b=2; x.a; }));
  ASSERT(2, ({ struct {int a; int b;} x; x.a=1; x.b=2; x.b; }));
  ASSERT(1, ({ struct {char a; int b; char c;} x; x.a=1; x.b=2; x.c=3; x.a; }));
  ASSERT(2, ({ struct {char a; int b; char c;} x; x.b=1; x.b=2; x.c=3; x.b; }));
  ASSERT(3, ({ struct {char a; int b; char c;} x; x.a=1; x.b=2; x.c=3; x.c; }));

  ASSERT(0, ({ struct {char a; char b;} x[3]; char *p=x; p[0]=0; x[0].a; }));
  ASSERT(1, ({ struct {char a; char b;} x[3]; char *p=x; p[1]=1; x[0].b; }));
  ASSERT(2, ({ struct {char a; char b;} x[3]; char *p=x; p[2]=2; x[1].a; }));
  ASSERT(3, ({ struct {char a; char b;} x[3]; char *p=x; p[3]=3; x[1].b; }));

  ASSERT(6, ({ struct {char a[3]; char b[5];} x; char *p=&x; x.a[0]=6; p[0]; }));
  ASSERT(7, ({ struct {char a[3]; char b[5];} x; char *p=&x; x.b[0]=7; p[3]; }));

  ASSERT(6, ({ struct { struct { char b; } a; } x; x.a.b=6; x.a.b; }));

  ASSERT(8, ({ struct {int a;} x; sizeof(x); }));
  ASSERT(16, ({ struct {int a; int b;} x; sizeof(x); }));
  ASSERT(16, ({ struct {int a, b;} x; sizeof(x); }));
  ASSERT(24, ({ struct {int a[3];} x; sizeof(x); }));
  ASSERT(32, ({ struct {int a;} x[4]; sizeof(x); }));
  ASSERT(48, ({ struct {int a[3];} x[2]; sizeof(x); }));
  ASSERT(2, ({ struct {char a; char b;} x; sizeof(x); }));
  ASSERT(9, ({ struct {char a; int b;} x; sizeof(x); }));
  ASSERT(0, ({ struct {} x; sizeof(x); }));

  printf("OK\n");
  return 0;
}
```

‍
