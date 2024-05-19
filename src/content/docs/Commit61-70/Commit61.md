---
title: 61. Void Type
---

## commit log

```plaintext
Add void type
```

`void`主要的作用还是作为指针。但不可以直接解引用。

## 头文件

```c
typedef enum {
  TY_VOID,
  // other fields
} TypeKind;

extern Type *ty_void;
```

## Lexer

添加对`void`关键字的支持：

```c
static bool is_keyword(Token *tok) {
  static char *kw[] = {
    "return", "if", "else", "for", "while", "int", "sizeof", "char",
    "struct", "union", "short", "long", "void"
  }
  // code 
}
```

## Type.c

把`ty_void`实例化：

```c
Type *ty_void = &(Type){TY_VOID, 1, 1};
```

修改`add_type`，主要是修改解引用的部分，不允许对一个`void*`解引用：

```c
void add_type(Node *node) {
  // code
  switch (node->kind) {
    // other cases
    case ND_DEREF:
      if (!node->lhs->ty->base)
        error_tok(node->tok, "invalid pointer dereference");
      if (node->lhs->ty->base->kind == TY_VOID)
        error_tok(node->tok, "dereferencing a void pointer");
      node->ty = node->lhs->ty->base;
      return ;
  }
}
```

## Parser

首先修改`is_typename`，原先的`is_typename`是用多个equal来做的，现在我们改成先前`is_keyword`的形式。

```c
static bool is_typename(Token *tok) {
  static char *kw[] = {
    "void", "char", "short", "int", "long", "struct", "union",
  };
  for(int i = 0; i < sizeof(kw) /  sizeof(*kw); i++) {
    if (equal(tok, kw[i]))
      return true;
  }
  return false;
}
```

然后修改`declaration`函数，不允许直接出现一个void变量。

```c
static Node *declaration(Token **rest, Token *tok) {
  // code
  Type *ty = declarator(&tok, tok, basety);
  if (ty->kind == TY_VOID)
    error_tok(tok, "variable declared void");
  // code
}
```

最后修改`declspec`，添加对`void*`的支持。

```c
static Type *declspec(Token **rest, Token *tok) {
  if (equal(tok, "void"))
    *rest = tok->next;
    return ty_void;
  // code
}
```

## test.sh

```c
// variable.c
int main() {
  { void* x;}
  //...
}
```
