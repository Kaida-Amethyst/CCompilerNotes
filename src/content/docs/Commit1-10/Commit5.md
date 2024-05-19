---
title: 5. Arithmetic Operators
---

## Commit log

```plaintext
Add *, / and ()
```

添加乘法和除法，和括号。

## 思路

乘法，除法和括号的添加，实际上意味着先前对tokens的处理就走不通了，因为这样我们就引入了优先级的概念，不能再单纯利用链表来进行处理，所以这一次，要使用树这个结构。也就是说，从这个commit开始，我们就要正式引入parser了。

## 范式

既然要使用parser，就必须开始思考语法范式，为了贴合chibicc的代码，这里直接利用chibicc的一些符号：

```plaintext
expr : mul + mul
     | mul - mul
     ;

mul : primary * primary
    | primary / primary
    ;

primary : Num
	| ( expr )
```

## 汇编代码

理论上来说，我们可能需要使用多个寄存器，这就涉及到寄存器分配的问题，但是此处我们还不希望涉及此类话题，因此我们这么做，我们只使用`%rax`和`%rdi`这两个寄存器，然后利用`push`和`pop`指令。

```x86asm
push %rax //意思是，将%rax的值放到一个寄存器栈里面
pop  %rdi //意思是，将栈顶的值取出放到%rdi寄存器内
```

### 一个例子

`(5-2)*3`怎么翻译？

```x86asm
  mov $3, %rax
  push %rax
  mov $2, %rax
  push %rax
  mov $5, %rax
  pop %rdi
  sub %rdi, %rax
  pop %rdi
  imul %rdi, %rax
  ret
```

## Tokenize

首先需要修改`tokenize`函数，让其支持识别左右括号：

```c
 static Token *tokenize(void) { 
   // ....
   if (ispunct(*p)) {
      cur = cur->next = new_token(TK_PUNCT, p, p + 1);
      p++;
      continue;
    }
    // ....
}
```

接着来写语法分析器。

## Parser

语法分析最后要生成的是一棵抽象语法树AST，既然是树就要有节点，先来设定节点类型：

```c
typedef enum {
  ND_ADD, // +
  ND_SUB, // -
  ND_MUL, // *
  ND_DIV, // /
  ND_NUM, // Integer
} NodeKind;

```

然后是节点结构：

```c
// AST node type
typedef struct Node Node;
struct Node {
  NodeKind kind; // Node kind
  Node *lhs;     // Left-hand side
  Node *rhs;     // Right-hand side
  int val;       // Used if kind == ND_NUM
};
```

然后是初始化方法，这里设定三种初始化方法，一个通用初始化方法，一个用于初始化叶节点，一个用于初始化非叶节点。

```c
static Node *new_node(NodeKind kind) {
  Node *node = calloc(1, sizeof(Node));
  node->kind = kind;
  return node;
}

static Node *new_binary(NodeKind kind, Node *lhs, Node *rhs) {
  Node *node = new_node(kind);
  node->lhs = lhs;
  node->rhs = rhs;
  return node;
}

static Node *new_num(int val) {
  Node *node = new_node(ND_NUM);
  node->val = val;
  return node;
}
```

然后，就要开始遍历token链表，表达式的最顶上应该是一个expr，依据这一点来写我们的语法分析：

```c
static Node *expr(Token **rest, Token *tok);
static Node *mul(Token **rest, Token *tok);
static Node *primary(Token **rest, Token *tok);

// expr = mul ("+" mul | "-" mul)*
static Node *expr(Token **rest, Token *tok) {
  Node *node = mul(&tok, tok);

  for (;;) {
    if (equal(tok, "+")) {
      node = new_binary(ND_ADD, node, mul(&tok, tok->next));
      continue;
    }

    if (equal(tok, "-")) {
      node = new_binary(ND_SUB, node, mul(&tok, tok->next));
      continue;
    }

    *rest = tok;
    return node;
  }
}

// mul = primary ("*" primary | "/" primary)*
static Node *mul(Token **rest, Token *tok) {
  Node *node = primary(&tok, tok);

  for (;;) {
    if (equal(tok, "*")) {
      node = new_binary(ND_MUL, node, primary(&tok, tok->next));
      continue;
    }

    if (equal(tok, "/")) {
      node = new_binary(ND_DIV, node, primary(&tok, tok->next));
      continue;
    }

    *rest = tok;
    return node;
  }
}

// primary = "(" expr ")" | num
static Node *primary(Token **rest, Token *tok) {
  if (equal(tok, "(")) {
    Node *node = expr(&tok, tok->next);
    *rest = skip(tok, ")");
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

## Code gen

在获得语法树后，我们就可以来写代码生成了。原理很简单，就是遍历整个AST，先遍历左子树，把左子树的结果放到rax寄存器中，再push进栈，再遍历右子树，再把栈顶的元素pop出来到%rdi中，再插入一条计算指令。

```c
//
// Code generator
//

static int depth;

static void push(void) {
  printf("  push %%rax\n");
  depth++;
}

static void pop(char *arg) {
  printf("  pop %s\n", arg);
  depth--;
}

static void gen_expr(Node *node) {
  if (node->kind == ND_NUM) {
    printf("  mov $%d, %%rax\n", node->val);
    return;
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

最后我们来修改我们的main函数：

```c
int main (int argc, char** argv) {
  if (argc != 2) {
    fprintf(stderr, "%s, invalid number of arguments.\n", argv[0]);
    return 1;
  }
  // Tokenize and parse.
  current_input = argv[1];
  Token *tok = tokenize();
  Node *node = expr(&tok, tok);

  if (tok->kind != TK_EOF)
    error_tok(tok, "extra token");

  printf("  .globl main\n");
  printf("main:\n");

  // Traverse the AST to emit assembly.
  gen_expr(node);
  printf("  ret\n");

  assert(depth == 0);
  return 0;
}
```

## test.sh

来添加三个测例：

```bash
assert 47 '5+6*7'
assert 15 '5*(9-6)'
assert 4 '(3+5)/2'
```

‍
