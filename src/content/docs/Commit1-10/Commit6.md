---
title: 6. Unary Operators
---

## Commit log

```plaintext
Add unary plus and minus
```

添加unary操作，也就是让我们的表达式解析支持类似于`-3+2`，`-(2-3)*(+4)`之类的操作。

## 思路

我们原先的范式需要稍作修改，变成如下的内容：

```plaintext
expr : mul + mul
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

注意上面的范式揭露了一个问题，就是我们是允许类似于`++10`这种表达式出现的，它就是10，而对于`--10`，它也是10。

## 汇编代码

primary我们已经知道怎么去生成了，那么对于unary，就是识别到它的符号，然后使用`neg`指令。

```x86asm
mov  $3 %rax
neg  %rax
```

## Parser

首先对于Parser中的Node添加一种新的neg类型，因为unary只有`-`需要做额外的处理，而初始化这种Node的方法与binary类似，但是只有左操作数有值，右操作数是空指针。

```c++
typedef enum {
  ND_ADD,
  ND_SUB,
  ND_MUL,
  ND_DIV,
  ND_NEG, // unary -
  ND_NUM,
} NodeKind;

static Node*new_unary(NodeKind kind, Node*expr) {
  Node* node = new_node(kind);
  node->lhs = expr;
  return node;
}
```

添加对于unary的解析：

```c++
// unary = ('+' | '-') unary
//       | primary
static Node *unary(Token **rest, Token *tok) {
  if (equal(tok, "+")) {
    return unary(rest, tok->next);
  } 
  if (equal(tok, "-")) {
    return new_unary(ND_NEG, unary(rest, tok->next));
  }
  return primary(rest, tok);
}
```

然后将对mul的解析做修改：

```c++
static Node *mul(Token **rest, Token *tok) {
  Node *node = unary(&tok, tok);

  for (;;) {
    if (equal(tok, "*")) {
      node = new_binary(ND_MUL, node, unary(&tok, tok->next));
      continue;
    }

    if (equal(tok, "/")) {
      node = new_binary(ND_DIV, node, unary(&tok, tok->next));
      continue;
    }

    *rest = tok;
    return node;
  }
}
```

最后一个需要修改的地方是代码生成中的`gen_expr`，注意当前遍历到的node此时有可能是一个unary了，当然此时我们只有一种unary就是符号，但也许要添加，将`gen_expr`做如下的修改：

```c++
static void gen_expr(Node *node) {
  switch(node->kind) {
    case ND_NUM:
      printf("  mov $%d, %%rax\n", node->val);
      return ;
    case ND_NEG:
      gen_expr(node->lhs);
      printf("  neg %%rax\n");
      return ;
  }

  gen_expr(node->rhs);
  push();
  gen_expr(node->lhs);
  pop("%rdi");

  switch (node->kind) {
  case ND_ADD:
    printf("  add %%rdi, %%rax\n");
    return;
  case ND_SUB:
    printf("  sub %%rdi, %%rax\n");
    return;
  case ND_MUL:
    printf("  imul %%rdi, %%rax\n");
    return;
  case ND_DIV:
    printf("  cqo\n");
    printf("  idiv %%rdi\n");
    return;
  }

  error("invalid expression");
}
```

这样就完成了。

## test.sh

添加如下的测例：

```bash
assert 4 '(3+5)/2'
assert 10 '-10+20'
assert 10 '- -10'
assert 10 '- - +10'
```

‍
