---
title: 66. 32 Bit Registers
---

## commit log

```plaintext
Use 32 bit registers for char, short and int
```

之前我们对char，short和int做运算的时候统一使用64位寄存器，现在我们对这三种类型统一改成32位寄存器。

## codegen

修改一下codegen的部分即可

```c
static void gen_expr(Node *node) {
  // code
  char *ax, *di;

  if (node->lhs->ty->kind == TY_LONG || node->lhs->ty->base) {
    ax = "%rax"; di = "%rdi";
  } else {
    ax = "%eax"; di = "%edi";
  }

  switch(node->kind) {
  case ND_ADD:
    println("  add %s, %s", di, ax); return ;
  case ND_SUB:
    println("  sub %s, %s", di, ax); return ;
  case ND_MUL:
    println("  imul %s, %s", di, ax); return ;
  case ND_DIV:
    if (node->lhs->ty->size == 0)
      println("  cqo");
    else
      println("  cdq");
    println("  idiv %s", di);
    return ;
  case ND_EQ:
  case ND_NE:
  case ND_LT:
  case ND_LE:
    println("  cmp %s, %s", di, ax);
    // code
  }
  // code
}
```
