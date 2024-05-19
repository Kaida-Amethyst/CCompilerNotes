---
title: 96. Variable Initializers
---

## commit log

```plaintext
Support local variable initializers
```

 支持局部变量初始化。先前仅仅支持一个单变量初始化，这里要支持数组和`struct`的初始化。

本质上来说，对于数组和`struct`的初始化，相当于给AST插入了多个逗号表达式。

## Parser

下面的`ND_NULL_EXPR`其实在这里不加也可以，主要是为了代码更简洁。

```c
typedef enum {
  // other fields
  ND_NULL_EXPR,  //Do nothing
} NodeKind;

// This struct represents a variable initializer.
// Since initializers can be nested 
// (e.g. `int x[2][2] = {{1,2}, {3,4}}`), this
// struct is a tree data structure.
typedef struct Initializer Initializer;
struct Initializer {
  Initializer *next;
  Type *ty;
  Token *tok;

  // If it's not an aggregate type and has an initializer
  // `expr` has an initialization expression
  Node *expr;

  // If it's am initializer for an aggregate type (array or struct)
  // `children` has initializers for its children
  Initializer **children;
};

// For local variable initializer
typedef struct InitDesg InitDesg;
struct InitDesg {
  InitDesg *next;
  int idx;
  Obj *var;
};
```

‍

```c
static Initializer *new_initializer(TYpe *ty) {
  Initializer *init = calloc(1, sizeof(Initializer));
  init->ty = ty;
  if (ty->kind == TY_ARRAY) {
    init->children = calloc(ty->array_len, sizeof(Initializer*));
    for(int i = 0; i < ty->array_len; i++)
      init->children[i] = new_initializer(ty->base);
  }
  return init;
}

static Node *declaration(Token **rest, Token *tok, Type *basety) {
  Node head = {};
  Node *cur = &head;
  int i = 0; 

  while (!equal(tok, ";")) {
    if (i++ > 0) 
      tok = skip(tok, ",");

    Type *ty = declarator(&tok, tok, basety);
    if (ty->size < 0) 
      error_tok(tok, "variable has incomplete type");
    if (ty->kind == TY_VOID)
      error_tok(tok, "variable declared void");

    Obj *var = new_lvar(get_ident(ty->name), ty); 
    //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
    if (equal(tok, "=")) {
      Node *expr = lvar_initializer(&tok, tok->next, var);
      cur = cur->next = new_unary(ND_EXPR_STMT, expr, tok);
    }
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  }

  Node *node = new_node(ND_BLOCK, tok);
  node->body = head.next;
  *rest = tok->next;
  return node;
}
```

上面调用了`lvar_initializer`，下面是它的实现：

```c
// A variable definition with an initializer is a shorthand notation
// for a variable definition followed by assignments. This function
// generates assignment expressions for an initializer. For example,
// `int x[2][2] = {{6, 7}, {8, 9}}` is converted to the following
// expressions:
//
//   x[0][0] = 6;
//   x[0][1] = 7;
//   x[1][0] = 8;
//   x[1][1] = 9;
static Node *lvar_initializer(Token **rest, Token *tok, Obj *var) {
  Initializer *init = initializer(rest, tok, var->ty);
  InitDesg desg = {NULL, 0, var};
  return create_lvar_init(init, var->ty, &desg, tok);
}

static Node *create_lvar_init(Initializer *init, Type *ty, InitDesg *desg, Token *tok) {
  if (ty->kind == TY_ARRAY) {
    Node *node = new_node(ND_NULL_EXPR, tok);
    for (int i = 0; i < ty->array_len; i++) {
      InitDesg desg2 = {desg, i};
      Node *rhs = create_lvar_init(init->children[i], ty->base, &desg2, tok);
      node = new_binary(ND_COMMA, node, rhs, tok);
    }
    return node;
  }

  Node *lhs = init_desg_expr(desg, tok);
  Node *rhs = init->expr;
  return new_binary(ND_ASSIGN, lhs, rhs, tok);
}

static Node *init_desg_expr(InitDesg *desg, Token *tok) {
  if (desg->var)
    return new_var_node(desg->var, tok);

  Node *lhs = init_desg_expr(desg->next, tok);
  Node *rhs = new_num(desg->idx, tok);
  return new_unary(ND_DEREF, new_add(lhs, rhs, tok), tok);
}

static Initializer *initializer(Token **rest, Token *tok, Type *ty) {
  Initializer *init = new_initializer(ty);
  initializer2(rest, tok, init);
  return init;
}

// initializer = "{" initializer ("," initializer)* "}"
//             | assign
static void initializer2(Token **rest, Token *tok, Initializer *init) {
  if (init->ty->kind == TY_ARRAY) {
    tok = skip(tok, "{");

    for (int i = 0; i < init->ty->array_len; i++) {
      if (i > 0)
        tok = skip(tok, ",");
      initializer2(&tok, tok, init->children[i]);
    }
    *rest = skip(tok, "}");
    return;
  }

  init->expr = assign(rest, tok);
}

```

## Codegen

只需要改动一处：

```c
static void gen_expr(Node *node) {
  // ...
  switch(node->kind) {
  case ND_NULL_EXPR:
    return ;
  }
}
```

## test

```c
#include "test.h"

int main() {
  ASSERT(1, ({ int x[3]={1,2,3}; x[0]; }));
  ASSERT(2, ({ int x[3]={1,2,3}; x[1]; }));
  ASSERT(3, ({ int x[3]={1,2,3}; x[2]; }));
  ASSERT(3, ({ int x[3]={1,2,3}; x[2]; }));

  ASSERT(2, ({ int x[2][3]={{1,2,3},{4,5,6}}; x[0][1]; }));
  ASSERT(4, ({ int x[2][3]={{1,2,3},{4,5,6}}; x[1][0]; }));
  ASSERT(6, ({ int x[2][3]={{1,2,3},{4,5,6}}; x[1][2]; }));

  printf("OK\n");
  return 0;
}
```
