---
title: 54. Unions
---

## commit log

```plaintext
Add union
```

struct之后，紧接着就是对union的支持。

## 头文件

首先添加一种新类型：

```c
typedef enum {
  // other kinds
  TY_UNION,
} TypeKind;
```

## Lexer

在词法分析中添加新的关键字：

```c
static bool is_keyword(Token *tok) {
  static char *kw[] = {
    "return", "if", "else", "for", "while", "int", "sizeof", "char",
    "struct", "union",
  };
  // other code
}
```

## Parser

修改`is_typename`函数：

```c
static bool is_typename(Token *tok) {
  return equal(tok, "char") || equal(tok, "int") || equal(tok, "struct") || equal(tok, "union");
}
```

添加一个新的函数声明，在`declspec`中添加对这个函数的调用。

```c
static Type *union_decl(Token **rest, Token *tok);

static Type *declspec(Token **rest, Token *tok) {
  // other code

  if (equal(tok, "union")) 
    return union_decl(rest, tok->next);
  // other code
}
```

与之前实现struct不同，这里对union的支持直接就是支持Tag的，我们这里把先前的`struct_decl`函数更名为`struct_union_decl`，让`struct_decl`去调用这个`struct_union_decl`。

```c
// struct-union-decl = ident? ("{" struct-members)?
static Type *struct_union_decl(Token **rest, Token *tok) {
  // Read a tag.
  Token *tag = NULL;
  if (tok->kind == TK_IDENT) {
    tag = tok;
    tok = tok->next;
  }

  if (tag && !equal(tok, "{")) {
    Type *ty = find_tag(tag);
    if (!ty)
      error_tok(tag, "unknown struct type");
    *rest = tok;
    return ty; 
  }

  // Construct a struct object.
  Type *ty = calloc(1, sizeof(Type));
  ty->kind = TY_STRUCT;
  struct_members(rest, tok->next, ty);
  ty->align = 1;

  // Register the struct type if a name was given.
  if (tag)
    push_tag_scope(tag, ty);
  return ty; 
}
```

然后来实现`struct_decl`，其实就是调用`struct_union_decl`。

```c
// struct-decl = struct-union-decl
static Type *struct_decl(Token **rest, Token *tok) {
  Type *ty = struct_union_decl(rest, tok);
  ty->kind = TY_STRUCT;

  // Assign offsets within the struct to members.
  int offset = 0;
  for (Member *mem = ty->members; mem; mem = mem->next) {
    offset = align_to(offset, mem->ty->align);
    mem->offset = offset;
    offset += mem->ty->size;

    if (ty->align < mem->ty->align)
      ty->align = mem->ty->align;
  }
  ty->size = align_to(offset, ty->align);
  return ty; 
}

```

然后来实现`union_decl`：

```c
// union-decl = struct-union-decl
static Type *union_decl(Token **rest, Token *tok) {
  Type *ty = struct_union_decl(rest, tok);
  ty->kind = TY_UNION;

  // If union, we don't have to assign offsets because they
  // are already initialized to zero. We need to compute the
  // alignment and the size though.
  for (Member *mem = ty->members; mem; mem = mem->next) {
    if (ty->align < mem->ty->align)
      ty->align = mem->ty->align;
    if (ty->size < mem->ty->size)
      ty->size = mem->ty->size;
  }
  ty->size = align_to(ty->size, ty->align);
  return ty;
}

```

上面的代码可以清晰的看出`struct`和`union`的差异。

最后，修改一下`struct_ref`函数：

```c
static Node *struct_ref(Node *lhs, Token *tok) {
  add_type(lhs);
  if (lhs->ty->kind != TY_STRUCT && lhs->ty->kind != TY_UNION) 
    error_tok(lhs->tok, "not a struct nor a union");
  // other code
}
```

## test.sh

最后，添加union的测例：

```c
#include "test.h"

int main() {
  ASSERT(8, ({ union { int a; char b[6]; } x; sizeof(x); }));
  ASSERT(3, ({ union { int a; char b[4]; } x; x.a = 515; x.b[0]; }));
  ASSERT(2, ({ union { int a; char b[4]; } x; x.a = 515; x.b[1]; }));
  ASSERT(0, ({ union { int a; char b[4]; } x; x.a = 515; x.b[2]; }));
  ASSERT(0, ({ union { int a; char b[4]; } x; x.a = 515; x.b[3]; }));

  printf("OK\n");
  return 0;
}
```

‍
