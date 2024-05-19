---
title: 48. Comma Operator
---

## commit log

```plaintext
Add comma operator
  
This patch allows writing a comma expression on the left-hand side
of an assignment expression. This is called the "generalized lvalue"
which is a deprecated GCC language extension. I'm implementing it
anyway because it's useful to implement other features.
```

根据chibicc的描述，这个特性实际上是被gcc废除的一个特性，目前的gcc已经不支持这种写法了（g++还支持），不过chibicc实现它，是为了之后的一些特性做铺垫。

它指的是这种表达式：

```c
int x = 1, y;
(x = 2, y) = 3;
```

其中的`(x=2, y)`是一个逗号表达式，`x=2`生效，整个表达式的左值是`y`，它后来被赋值为3。

‍

## Parser

首先添加新的节点类型：

```c
typedef enum {
  // Other kinds
  ND_COMMA,
} NodeKind;
```

它要被解释成一个表达式：

```c
static Node *expr(Token **rest, Token *tok) {
  Node* node = assign(&tok, tok);

  if (equal(tok, ",")) {
    return new_binary(ND_COMMA, node, expr(rest, tok->next), tok);
  }
  *rest = tok;
  return node;
}
```

## Codegen

不同于一般的表达式，它是可以被赋值的，因此在`gen_addr`和`gen_expr`都需要加上`ND_COMMA`的case。

```c
static void gen_addr(Node *node) {
  switch(node->kind) {
    case ND_COMMA:
      gen_expr(node->lhs);
      gen_addr(node->lhs);
      return ;
  }
  // code
}

static void gen_expr(Node *node) {
  // code
  case ND_COMMA:
    gen_expr(node->lhs);
    gen_expr(node->lhs);
    return ;
  // code 
}
```

## type.c

注意整个表达式的类型，取最右边的表达式的类型：

```c
void add_type(Node *node) {
  // other cases
  case ND_COMMA:
    node->ty = node->rhs->ty;
    return ;
  // other cases
}
```

‍
