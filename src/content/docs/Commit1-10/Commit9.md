---
title: 9. Processing Statements
---

## Commit log

```plaintext
Accept multiple statements separated by semicolons.
```

这一个commit，来添加多个语句。譬如说像这样：

```plaintext
1+2；3×4; 5*(7+2);
```

每个语句使用分号隔开。

## 思路

我们现在的语法分析，仅仅支持一棵树，要支持上面的功能，就需要有多棵树，考虑到程序语言往往是按顺序分析的，我们用链表来标识这样的树。我们添加一个Node类型，为`EXPR_STMT`，然后在Node的结构体上，添加一个next字段。

```c
typedef enum {
  ND_ADD, // +
  ...
  ND_EXPR_STMT,  // <-----
} NodeKind;

struct Node {
  NodeKind kind;
  Node *lhs;
  Node *rhs;
  Node *next;   // <------
  int val;
}
```

## 范式

原有的范式就需要做一定的修改，改成如下的形式：

(要允许`stmt`可以为空，否则第一个规则会有问题)

```plaintext
stmt : expr ; stmt
     |
     ;

expr : add CMP add 
     ; 

CMP  : '=='
     | '!='
     | '<'
     | '<='
     | '>'
     | '>='
     ;

add  : mul + mul
     | mul - mul
     ;

mul : unary * unary
    | unary / unary
    ;

unary : + unary
      | - unary
      | primary
      ;

primary : Num
	| ( expr )
```

## Parser

既然增加了一个`stmt`的节点，就需要写这个节点的生成函数：

```c
static Node *stmt(Token **rest, Token *tok) {
  return expr_stmt(rest, tok); 
}

static Node *expr_stmt(Token **rest, Token *tok) {
  Node *node = new_unary(ND_EXPR_STMT, expr(&tok, tok));
  *rest = skip(tok, ";");
  return node;
}
```

另外要注意修改parse函数：

```c
Node *parse(Token *tok) {
  Node *node = expr(&tok, tok);
  if (tok->kind != TK_EOF)
    error_tok(tok, "extra token");
  return node;
  Node head = {};
  Node *cur = &head;
  while (tok->kind != TK_EOF) {
    cur = cur->next = stmt(&tok, tok);
  }
  return head.next;
}
```

## Codegen

我们这里的codegen还只是简单的codegen，就是每个expr按照原先的逻辑去生成代码。

```c
static void gen_stmt(Node *node) {
  if (node->kind == ND_EXPR_STMT) {
    gen_expr(node->lhs);
    return ;
  }

  error("invalid statement");
}

void codegen(Node *node) {
  printf("  .globl main\n");
  printf("main:\n");
 
  gen_expr(node);
  printf("  ret\n");
  for(Node *n = node; n; n = n->next) {
    gen_stmt(n);
    assert(depth == 0);
  }
 
  assert(depth == 0);
  printf("  ret\n");
}

```

## test.sh

最后添加一个测例：

```bash
assert 3 '1; 2; 3;'
```

‍
