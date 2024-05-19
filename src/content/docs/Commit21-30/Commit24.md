---
title: 24. Function Call Arguments
---

## commit log

```plaintext
Support function call with up to 6 arguments
```

允许我们的函数调用最多有6个参数。

## 思路

根据CSAPP的描述，对于x86而言，对于不少于6个参数的多个参数的情况下，第一个参数放到`rdi`寄存器内，第二个参数放到`rsi`，依次下去分别是`rdx`，`rcx`，`r8`和`r9`。

然后还要注意的是我们的函数调用经常是支持如下的形式的：

```c
int add(int a, int b) {return a+b;}

int a = 32, b = 78;
int z = add(1+2, add(2*5+3, a*b));
```

所以在解析每一个参数的时候，要把每一个参数当成一个expr来看待。

## 头文件

首先在Node结构体里加上`args`字段。

```c
struct Node {
  /*  other fields  */ 
  char *funcname;
  Node *args;
  /*  other fields  */
}
```

## Type

对于args，我们要对其应用add_type。

```c
void add_type(Node *node) {
  /*  other code  */
  for (Node *n = node->body; n; n = n->next)
    add_type(n);
  for (Node *n = node->args; n; n = n->next)    // <---
    add_type(n);                                // <---
  /*  other code  */
}
```

## parser

我们原先是在对primary的解析中顺便解析函数调用的，这一次我们得专门写一个函数来解析函数调用了。

```c
// funcall = ident "(" (assign ("," assign)*)? ")"
static Node *funcall(Token **rest, Token *tok) {
  // 注意我们一开始的token是一个ident，也就是函数名
  Token *start = tok;
  // 它的第一个参数是tok的next（左括号）的next
  tok = tok->next->next;

  Node head = {};
  Node *cur = &head;
  // 只要不碰见右括号，就进行循环
  while (!equal(tok, ")")) {
    if (cur != &head)
      tok = skip(tok, ",");
    // 注意把每一个表达式解析成assign
    cur = cur->next = assign(&tok, tok);
  }

  *rest = skip(tok, ")");
  // 之后就是新创建funcall的Node了
  Node *node = new_node(ND_FUNCALL, start);
  node->funcname = strndup(start->loc, start->len);
  node->args = head.next;
  return node;
}
```

当然，也要相应修改`pirmary`

```c
static Node *primary(Token **rest, Token *tok) {
  /*  other cases */
  if (tok->kind == TK_IDENT) {
    // Function call
    if (equal(tok->next, "("))
      return funcall(rest, tok);
    /* Variable cases  */ 
  }
  /*  other cases  */
}
```

## codegen

对funcall节点进行代码生成时，首先对每个arg进行`gen_expr`操作，然后进行push。在`call`的前面进行pop。但是这里记住push和pop的顺序。

```c
static char *argreg[] = {"%rdi", "%rsi", "%rdx", "%rcx", "%r8", "%r9"};

static void gen_expr(Node *node) {
  switch(node->kind) {
    /*  other cases  */
    case ND_FUNCALL: {
      int nargs = 0;
      for(Node *arg = node->args; arg; arg = arg->next) {
        gen_expr(arg);
        push();
        nargs++;
      }
      for(int i = nargs - 1; i>= 0; i--) 
        pop(argreg[i]);

      printf("  mov $0, %%rax\n");
      printf("  call %s\n", node->funcname);
      return ;
    }
  }
}
```

## test.sh

在test.sh开头，将tmp2.o的编译修改如下：

```bash
cat <<EOF | gcc -xc -c -o tmp2.o -
int ret3() { return 3; }
int ret5() { return 5; }
int add(int x, int y) { return x+y; }
int sub(int x, int y) { return x-y; }

int add6(int a, int b, int c, int d, int e, int f) {
  return a+b+c+d+e+f;
}
EOF
```

然后添加以下测例：

```bash
assert 8 '{ return add(3, 5); }'
assert 2 '{ return sub(5, 3); }'
assert 21 '{ return add6(1,2,3,4,5,6); }'
assert 66 '{ return add6(1,2,add6(3,4,5,6,7,8),9,10,11); }'
assert 136 '{ return add6(1,2,add6(3,add6(4,5,6,7,8,9),10,11,12,13),14,15,16); }'
```

‍
