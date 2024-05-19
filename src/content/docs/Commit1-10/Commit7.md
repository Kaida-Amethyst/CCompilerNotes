---
title: 7. Comparison Operators
---

## Commit log

```plaintext
 Add ==, !=, <= and >= operators
```

添加逻辑运算符。

## 思路

每一次添加新的运算符，都要思考一个问题，就是它的运算的优先级别是什么，因为C语言中的逻辑运算是有值的，逻辑值要么是0，要么是1。

看下面的表达式：

```c
3+2>1
```

很明显，我们更希望先做运算，后做比较，最后的结果是1，而不是4。那么这样一来，逻辑比较的运算优先级就要后于加减了。

## 范式

需要把范式再重新修改一下：

```
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

## 汇编代码

另外一个问题是，x86的比较指令是怎样的原理。

```x86asm
cmp %rdi, %rax
```

上面的指令中会让`%rdi-%rax`，这个结果是放在一个CPAZO的标志位上，使用set系列的指令去把这个结果放回到某个寄存器上：

```x86asm
sete %al
```

这样一来，如果`%rdi==%rax`，那么此时`%al`的值就会被设置成1。

但是要注意的是，这个`%al`寄存器的大小只有一个byte，不能直接使用`mov`赋值给`%rax`。需要进行零扩展后再进行赋值，也就是使用`movzb`指令：

```x86asm
movzb %al %rax
```

## Lexer

先来添加对逻辑符号的词法分析，注意这里与之前稍有不同的是，原先我们所有的符号都只有一个字节，这里出现了占有多个字节的符号，因此需要有一定的改写：

首先是对符号的处理：

```c
static int read_punct(char *p) {
  if (startswith(p, "==") || startswith(p, "!=") ||
      startswith(p, "<=") || startswith(p, ">="))
    return 2;

  return ispunct(*p) ? 1 : 0;
}
```

接着修改tokenize函数：

```c
static Token *tokenize(void) {
  char *p = current_input;
  Token head = {};
  Token *cur = &head;
  while(*p) {
    if (isspace(*p)) {p++; continue; }

    if (isdigit(*p)) {
      cur = cur->next = new_token(TK_NUM, p, p);
      char *q = p;
      cur->val = strtoul(p, &p, 10);
      cur->len = p - q;
      continue;
    }

    int punct_len = read_punct(p);
    if (punct_len) {
      cur = cur->next = new_token(TK_PUNCT, p, p + punct_len);
      p += cur->len;
      continue;
    }

    error_at(p, "invalid token");
  }
  cur = cur->next = new_token(TK_EOF, p, p);
  return head.next;
}
```

## Parser

然后拓展语法分析中的节点，添加等于，不等于，小于，以及小于等于四种节点类型。注意大于和大于等于实际上是小于和小于等于的变体。a<b的意思就是b>a，因为节点是一个二叉树，因此当发现a>b的时候，翻转过来即可。

```c
typedef enum {
  ND_ADD, // +
  ND_SUB, // -
  ND_MUL, // *
  ND_DIV, // /
  ND_EQ,  // ==
  ND_NE,  // !=
  ND_LT,  // <
  ND_LE,  // <=
  ND_NEG, // unary -
  ND_NUM, // Integer
} NodeKind;
```

然后，参考上面的范式，对expr的解析做一些修改。不过这里稍微注意一下的是，chibicc这里不是由expr直接推relational的，而是先从expr推一个equality，再从equality推relational。另外，原先expr的功能，由一个新函数add来替代。

```c
static Node *equality(Token **rest, Token *tok);
static Node *relational(Token **rest, Token *tok);

static Node *expr(Token **rest, Token *tok) {
  return equality(rest, tok);
}

static Node *equality(Token **rest, Token *tok) {
  Node *node = relational(&tok, tok);

  for(;;) {
    if (equal(tok, "==")) {
      node = new_binary(ND_EQ, node, relational(&tok, tok->next));
      continue;
    }

    if (equal(tok, "!=")) {
      node = new_binary(ND_NE, node, relational(&tok, tok->next));
      continue;
    }
    *rest = tok;
    return node;
  }
}

static Node *relational(Token **rest, Token *tok) {
  Node *node = add(&tok, tok);

  for (;;) {
    if (equal(tok, "<")) {
      node = new_binary(ND_LT, node, add(&tok, tok->next));
      continue;
    }

    if (equal(tok, "<=")) {
      node = new_binary(ND_LE, node, add(&tok, tok->next));
      continue;
    }

    if (equal(tok, ">")) {
      node = new_binary(ND_LT, add(&tok, tok->next), node);
      continue;
    }

    if (equal(tok, ">=")) {
      node = new_binary(ND_LE, add(&tok, tok->next), node);
      continue;
    }

    *rest = tok;
    return node;
  }
}
```

## CodeGen

对于CodeGen来说，主要是因为多了四种新的节点，因此也需要对这四种新节点做代码生成：

```c
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

## test.sh

添加以下的测例：

```bash
assert 0 '0==1'
assert 1 '42==42'
assert 1 '0!=1'
assert 0 '42!=42'

assert 1 '0<1'
assert 0 '1<1'
assert 0 '2<1'
assert 1 '0<=1'
assert 1 '1<=1'
assert 0 '2<=1'

assert 1 '1>0'
assert 0 '1>1'
assert 0 '1>2'
assert 1 '1>=0'
assert 1 '1>=1'
assert 0 '1>=2'
```
