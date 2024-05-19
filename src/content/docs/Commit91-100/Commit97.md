---
title: 97. Zero Array Initializers
---

## commit log

```plaintext
Initialize excess array elements with zero
```

添加对零初始化的支持。

上一次commit有一个小问题，就是我们要初始化一个数组，就必须得一次性把所有的数组值都给到，譬如`int x[3] = {1,2,3}`，但是更多时候，我们可能希望只初始化一部分，譬如`int x[100] = {1,2,3}`，未初始化的部分初始化为0。

## Parser

```c
typedef enum {
  // ...
  ND_MEMZERO;  // zero-clear a stack variable
} NodeKind;

// initializer = "{" initializer ("," initializer)* "}"
//             | assign
static void initializer2(Token **rest, Token *tok, Initializer *init) {
  if (init->ty->kind == TY_ARRAY) {
    tok = skip(tok, "{");

    for (int i = 0; i < init->ty->array_len && !equal(tok, "}"); i++) {
      if (i > 0) 
        tok = skip(tok, ",");
      initializer2(&tok, tok, init->children[i]);
    }  
    *rest = skip(tok, "}");
    return;
  }

  init->expr = assign(rest, tok);
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

  if (!init->expr)
    return new_node(ND_NULL_EXPR, tok);

  Node *lhs = init_desg_expr(desg, tok);
  return new_binary(ND_ASSIGN, lhs, init->expr, tok);
}

static Node *lvar_initializer(Token **rest, Token *tok, Obj *var) {
  Initializer *init = initializer(rest, tok, var->ty);
  InitDesg desg = {NULL, 0, var};

  // If a partial initializer list is given, the standard requires
  // that unspecified elements are set to 0. Here, we simply
  // zero-initialize the entire memory region of a variable before
  // initializing it with user-supplied values.
  Node *lhs = new_node(ND_MEMZERO, tok);
  lhs->var = var;

  Node *rhs = create_lvar_init(init, var->ty, &desg, tok);
  return new_binary(ND_COMMA, lhs, rhs, tok);
}
```

## Codegen

```c
static void gen_expr(Node *node) {
  switch(node->kind) {
  // ...
  case ND_MEMZERO:
    println("  mov $%d, %%rcx", node->var->ty->size);
    println("  lea %d(%%rbp), %%rdi", node->var->offset);
    println("  mov $0, %%al");
    println("  rep stosb");
    return;
  }
}
```

## test

```c
// initializer.c
int main() {
  ASSERT(0, ({ int x[3]={}; x[0]; }));
  ASSERT(0, ({ int x[3]={}; x[1]; }));
  ASSERT(0, ({ int x[3]={}; x[2]; }));

  ASSERT(2, ({ int x[2][3]={{1,2}}; x[0][1]; }));
  ASSERT(0, ({ int x[2][3]={{1,2}}; x[1][0]; }));
  ASSERT(0, ({ int x[2][3]={{1,2}}; x[1][2]; }));
}
```

‍
