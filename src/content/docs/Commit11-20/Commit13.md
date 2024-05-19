---
title: 13. Block Scopes
---

## Commit log

```plaintext
Add {...}
```

这一个commit，我们要引入花括号，实际上就相当于在代码中引入了域的概念。

## 思路

我们引入新的Node，类型为Block，这个Node可以容纳多个stmt。

## chibicc.h

```c
typedef enum {
  /* nodes */
  ND_BLOCK,
  /* nodes */
}

struct Node {
  NodeKind kind;
  Node *lhs;
  Node *rhs;
  Node *next;
  Node *body;  // <-----
  Obj *var;
  int val;
}
```

## parser

引入block之后，接下来就需要引入parser。

注意这里是不需要词法分析的，左右大括号实际上都是punct。

```c
static Node *compound_stmt(Token **rest, Token *tok);

static Node *compound_stmt(Token **rest, Token *tok) {
  Node head = {};
  Node *cur = &head;
  while(!equal(tok, "}")) 
    cur = cur->next = stmt(&tok, tok);
  Node *node = new_node(ND_BLOCK);
  node->body = head.next;
  *rest = tok->next;
  return node;
}
```

我们实际上是把原先parse的内容给搬到了这里来。因此`parse`函数的内容也要做相应的改变。现在parse函数改变成了：

```c
Function *parse (Token *tok) {
  tok = skip(tok, "{");

  Function *prog = calloc(1, sizeof(Function));
  prog->body = compound_stmt(&tok, tok);
  prog->locals = locals;
  return prog;
}
```

注意一下，我们现在规定，所有的stmt，都要用一对`{}`来包住。

另外，我们的stmt，也可以推出一对`{}`包住的stmts，因此，同样要修改stmt函数。

```c
static Node *stmt(Token **rest, Token *tok) {
  if (equal(tok, "return")) {
    Node *node = new_unary(ND_RETURN, expr(&tok, tok->next));
    *rest = skip(tok, ";");
    return node;
  }

  if (equal(tok, "{"))
    return compound_stmt(rest, tok->next);

  return expr_stmt(rest, tok);
}
```

实际上就相当于我们的stmt的范式再次变化：

```plaintex
stmt : "return" expr ";"
     | expr ";" stmt
     | "{" stmt "}"
     |
     ;
```

## CodeGen

主要需要修改`gen_stmt`函数，因为我们添加了新的Node Kind。

```c
static void gen_stmt(Node *node) {
  switch (node->kind) {
  case ND_BLOCK:
    for (Node *n = node->body; n; n = n->next)
      gen_stmt(n);
    return;
  case ND_RETURN:
    gen_expr(node->lhs);
    printf("  jmp .L.return\n");
    return;
  case ND_EXPR_STMT:
    gen_expr(node->lhs);
    return;
  }

  error("invalid statement");
}
```

当然这么一来，原有的codegen函数中，遍历`prog->body`的做法就不需要了，因为我们现在的程序，它的根节点就是一个block，因此在`codegen`函数中，直接调用它就好了。

```c
void codegen(Function *prog) {
  assign_lvar_offsets(prog);

  printf("  .globl main\n");
  printf("main:\n");

  // Prologue
  printf("  push %%rbp\n");
  printf("  mov %%rsp, %%rbp\n");
  printf("  sub $%d, %%rsp\n", prog->stack_size);

  gen_stmt(prog->body);
  assert(depth == 0); 

  printf(".L.return:\n");
  printf("  mov %%rbp, %%rsp\n");
  printf("  pop %%rbp\n");
  printf("  ret\n");
}

```

## test.sh

把所有测例都加上`{}`就好了。然后补充一个测例：

```bash
assert 3 '{ {1; {2;} return 3;} }'
```

‍
