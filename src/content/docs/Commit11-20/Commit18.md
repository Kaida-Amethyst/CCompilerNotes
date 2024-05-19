---
title: 18. Node Error Messages
---

## Commit log

```plaintext
Add a representative node to each Node to improve error messages
```

就是在出错的时候，要输出指示，而不是像原先那样仅仅是输出一个error信息。

## 思路

其实也很简单，因为早在commit 4的时候，我们就已经实现错误信息提示的函数`error_tok`，只是我们一直没有把这个函数用到语法分析和代码生成中来，现在把这个函数的使用范围扩大即可。

我们把Node再度扩展。添加一个token字段，这样在代码生成的时候，一旦发生错误，就直接使用`error_tok`函数即可。

## 头文件

```c
struct Node {
  // Other fields
  Token *tok;
  // Other fields
}
```

## Parser

parse阶段，我们要把所有的new系列，都添加一个参数Token：

```c
static Node * new_node(NodeKind kind);  // old
static Node * new_node(NodeKind kind, Token *tok) {  // new
  Node *node = calloc(1, sizeof(Node));
  node->kind = kind;
  node->tok = tok;    // <----
  return node;
} 

static Node *new_binary(NodeKind kind, Node *lhs, Node *rhs); // old
static Node *new_binary(NodeKind kind, Node *lhs, Node *rhs, Token *tok); // new

static Node *new_unary(NodeKind kind, Node *expr); // old
static Node *new_unary(NodeKind kind, Node *expr, Token *tok); // new

static Node *new_num(int val); // old
static Node *new_num(int val, Token *tok); // new

static Node *new_var_node(Obj *var); // old
static Node *new_var_node(Obj *var, Token *tok); // new
```

既然修改了函数的定义，自然我们也就需要修改函数的使用。

这里就不赘述了。
