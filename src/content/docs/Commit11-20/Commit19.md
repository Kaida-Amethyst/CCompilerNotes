---
title: 19. Unary References
---

## Commit log

```plaintext
Add unary & and *
```

注意这里是unary，就是取址和解引用。

## 思路

我们已经有了unary函数了，因此词法分析和语法分析就已经没有什么问题了。主要是代码生成的问题。

我们在commit 11当中实现了`gen_addr`函数：

```c
static void gen_addr(Node *node) {
  if (node->kind == ND_VAR) {
    printf("  lea %d(%%rbp), %%rax\n", node->var->offset);
    return;
  }

  error("not an lvalue");
}
```

所以，对于`&x`这样的表达式来说，其实直接用这个函数就ok了，因为上面这个函数中所调用的指令，就已经是把`x`的地址给取出来了。然后我们在这个基础上可以做其它操作。

那么解引用呢？

对于这种表达式`*x`，其实就是我们把`x`的值放到寄存器`rax`中，然后再利用`mov (%rax) %rax`即可。

## 头文件

添加新的Node类型：

```c
typedef enum {
  /*  other kinds*/
  ND_ADDR,
  ND_DEREF,
  /*  other kinds*/
} NodeKind;
```

## Parser

修改unary函数：

```c
// unary = ("+" | "-" | "*" | "&") unary
//       | primary
static Node *unary(Token **rest, Token *tok) {
  if (equal(tok, "+"))
    return unary(rest, tok->next);
  if (equal(tok, "-"))
    return new_unary(ND_NEG, unary(rest, tok->next), tok);
  if (equal(tok, "&"))
    return new_unary(ND_ADDR, unary(rest, tok->next), tok);
  if (equal(tok, "*"))
    return new_unary(ND_DEREF, unary(rest, tok->next), tok);
  return primary(rest, tok);
}
```

## Codegen

修改`gen_addr`函数：

```c
static void gen_addr(Node *node) {
  switch (node->kind) {
  case ND_VAR:
    printf("  lea %d(%%rbp), %%rax\n", node->var->offset);
    return;
  case ND_DEREF:
    gen_expr(node->lhs);
    return;
  }

  error_tok(node->tok, "not an lvalue");
}
```

修改`gen_expr`函数

```c
static void gen_expr(Node *node) {
  switch (node->kind) {
  /*  other cases */
  case ND_DEREF:
    gen_expr(node->lhs);
    printf("  mov (%%rax), %%rax\n");
    return;
  case ND_ADDR:
    gen_addr(node->lhs);
    return;
  /*  other cases */
  }
  /*  other code */
}

```

## test.sh

最后添加几个测例：

```bash
assert 3 '{ x=3; return *&x; }'
assert 3 '{ x=3; y=&x; z=&y; return **z; }'
assert 5 '{ x=3; y=5; return *(&x+8); }'
assert 3 '{ x=3; y=5; return *(&y-8); }'
assert 5 '{ x=3; y=&x; *y=5; return x; }'
assert 7 '{ x=3; y=5; *(&x+8)=7; return y; }'
assert 7 '{ x=3; y=5; *(&y-8)=7; return x; }'
```

‍
