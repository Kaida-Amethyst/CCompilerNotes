---
title: 10. Single Letter Variables
---

## Commit log

```plaintext
Support single-letter local variables.
```

## Motification

这一次Commit的目的是，我们希望引入变量的概念。

例如输入这样的语句，可以去计算

```plaintxt
a=3; b=2; c=a+b; c;
```

## 思路

那么这样就需要引入内存的概念了。我们需要两个寄存器，`%rbp`寄存器用来指向栈的顶部，`%rsp`寄存器用来指向程序分配的栈的底部。注意，栈是一个倒着的结构，因此`%rsp`的值要比`%rbp`要小。

这一节，我们在在栈上分配$26\times 8=208$字节的空间，之所以是26，是因为在这一个commit中，我们的变量名只有1个字母，其实这就有一点像我们事先把所有的可能的变量都预先声明好。有26个位置。这样我们的x86代码里面就像这样：

```x86asm
  .global main
main:
  push %rbp       // 一开始rbp指向是栈顶
  mov %rsp, %rbp  // 然后我们用rsp来指向栈尾
  sub $208, %rsp  // rsp减掉208字节，相当于在栈上给分配了208个字节
```

那么对于`a=3`这样的语句来说，它其实就可以翻译成：

```x86asm
mov $3, -8(%rbp)
```

不过这一次commit我们可能还做不到像这么翻译。因为这种属于高度优化后的代码，我们可以这么做：

首先扫描到`a`的时候，把它的地址取出来，放到`%rax`寄存器里面：

```x86asm
lea -8(%rbp), %rax
push %rax
```

这里的lea寄存器，其实就相当于一个mov，但是它是用来把地址进行传递，这里的`-8(%rbp)`，并不是一个取地址的操作，其实相当于一个`%rax=%rbp-8`。（具体的需要参看CASPP）。

然后赋值的时候：

```x86asm
mov $3, %rax
pop %rdi
mov %rax, (%rdi)
```

这样就完成了一个赋值操作。

那么如果要取出a的值，可以这么做：

```x86asm
lea -8(%rbp), %rax
mov (%rax), %rax
```

这样就把值给取出来了。

然后就可以沿用之前所有的逻辑了。

## Lexer

添加Token类型：

```c
typedef enum {
  TK_IDENT,    // <----
  TK_PUNCT,
  TK_NUM,
  TK_EOF,
}
```

然后在tokenize函数中，添加：

```c
Token * tokenize(char *p) {
  // ...
  while (*p) {
    // ...
    if ('a' <= *p && *p <= 'z') {
      cur = cur->next = new_token(TK_IDENT, p, p+1);
      p++;
      continue;
    ]
    // ...
  }
  // ...
}
```

## Parse

在语法解析中，首先添加新的节点类型，并且对节点的结构体做拓展：

```c
typedef enum {
  // ...
  ND_ASSIGN,
  ND_VAR,
} NodeKind;

// AST node type
typedef struct Node Node;
struct Node {
  NodeKind kind;
  Node *lhs;  
  Node *rhs;  
  Node *next;  
  char name; // <------ used if kind = ND_VAR
  int val;   
};
```

然后添加新的解析函数，这里稍微需要修改一下的是，要将范式再次修改一下：

```plaintext
stmt : expr ; stmt
     |
     ;

expr : assign
     ;

assign : add CMP add 
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

（范式并非是一个非常标准的范式，因此实际上我们当前的compiler还是非常不完善，很多语法其实是不符合现实逻辑的）。

那么我们的代码就需要修改为：

```c
// 原本expr的内容，现在变成return assign了
static Node *expr(Token **rest, Token *tok) {   
  return assign(rest, tok);
}

// 这里原本是expr的内容
static Node *assign(Token **rest, Token *tok) {
  Node *node = equality(&tok, tok);
  if (equal(tok, "="))
    node = new_binary(ND_ASSIGN, node, assign(&tok, tok->next));
  *rest = tok;
  return node;
}

static Node *new_var_node(char name) {
  Node *node = new_node(ND_VAR);
  node->name = name;
  return node;
}

static Node *primary(Token **rest, Token *tok) {
  if (equal(tok, "(")) {
    Node *node = expr(&tok, tok->next);
    *rest = skip(tok, ")");
    return node;
  }

  if (tok->kind == TK_IDENT) {
    Node *node = new_var_node(*tok->loc);    // <------
    *rest = tok->next;
    return node;
  }

  if (tok->kind == TK_NUM) {
    Node *node = new_num(tok->val);
    *rest = tok->next;
    return node;
  }

  error_tok(tok, "expected an expression");
}
```

## Codegen

然后是CodeGen, 主要是对两种新Node的处理：

```c
// 对ND_VAR的处理
static void gen_addr(Node* node) {
  if (node->kind == ND_VAR) {
    int offset = (node->name - 'a' + 1) * 8;
    printf("  lea %d(%%rbp), %%rax\n", -offset);
    return ;
  }
  error("not an lvalue");
}

// 对ND_ASSIGN的处理
static void gen_expr(Node *node) {
  switch(node->kind) {
    case ND_NUM:
      printf("  mov $%d, %%rax\n", node->val);
      return ;
    case ND_NEG:
      gen_expr(node->lhs);
      printf("  neg %%rax\n");
      return ;
    case ND_VAR:
      gen_addr(node);
      printf("  mov (%%rax), %%rax\n");
      return;
    case ND_ASSIGN:
      gen_addr(node->lhs);
      push();
      gen_expr(node->rhs);
      pop("%rdi");
      printf("  mov %%rax, (%%rdi)\n");
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
  case ND_EQ:
    printf("  cmp %%rdi, %%rax\n");
    printf("  sete %%al\n");
    printf("  movzb %%al, %%rax\n");
    return;
  case ND_NE:
    printf("  cmp %%rdi, %%rax\n");
    printf("  setne %%al\n");
    printf("  movzb %%al, %%rax\n");
    return;
  case ND_LT:
    printf("  cmp %%rdi, %%rax\n");
    printf("  setl %%al\n");
    printf("  movzb %%al, %%rax\n");
    return;
  case ND_LE:
    printf("  cmp %%rdi, %%rax\n");
    printf("  setle %%al\n");
    printf("  movzb %%al, %%rax\n");
    return;
  }

  error("invalid expression");
}

```

然后，需要修改一下codegen函数：

```c
void codegen(Node *node) {
  printf("  .globl main\n");
  printf("main:\n");

  // Prologue
  printf("  push %%rbp\n");
  printf("  mov %%rsp, %%rbp\n");
  printf("  sub $208, %%rsp\n");

  for(Node *n = node; n; n = n->next) {
    gen_stmt(n);
    assert(depth == 0);
  }

  printf("  mov %%rbp, %%rsp\n");
  printf("  pop %%rbp\n");
  printf("  ret\n");
}
```

## test.sh

```bash
assert 13 'a=1+3*4;b=(5+3)/8;c=a*b;c;'
```

‍
